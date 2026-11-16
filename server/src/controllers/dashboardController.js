const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductionBatch = require('../models/ProductionBatch');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Purchase = require('../models/Purchase');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getDashboardData = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    // 1. Today's metrics
    const todayOrders = await Order.find({
      orderDate: { $gte: todayStart, $lte: todayEnd },
      orderStatus: { $ne: 'cancelled' },
    });
    const todaySales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayOrderCount = todayOrders.length;

    // Production today
    const todayBatches = await ProductionBatch.find({
      productionDate: { $gte: todayStart, $lte: todayEnd },
      status: 'completed',
    });
    const todayProductionQty = todayBatches.reduce((sum, b) => sum + (b.producedQuantity || 0), 0);

    // Expenses today
    const todayExpensesList = await Expense.find({
      date: { $gte: todayStart, $lte: todayEnd },
    });
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Payments received today (partyType === 'customer')
    const todayPaymentsList = await Payment.find({
      partyType: 'customer',
      paymentDate: { $gte: todayStart, $lte: todayEnd },
    });
    const todayPaymentsReceived = todayPaymentsList.reduce((sum, p) => sum + p.amount, 0);

    // Workers present today
    const presentCount = await Attendance.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['present', 'half_day'] },
    });

    // Pending orders count
    const pendingOrdersCount = await Order.countDocuments({
      orderStatus: { $in: ['pending', 'processing', 'confirmed', 'packed'] },
    });

    // Pending purchases count
    const pendingPurchasesCount = await Purchase.countDocuments({
      status: 'ordered',
    });

    // Total outstanding customer dues
    const customerAgg = await Customer.aggregate([
      { $group: { _id: null, totalDue: { $sum: '$outstandingAmount' } } },
    ]);
    const totalCustomerDues = customerAgg.length > 0 ? customerAgg[0].totalDue : 0;

    // Total supplier payables
    const supplierAgg = await Supplier.aggregate([
      { $group: { _id: null, totalPayable: { $sum: '$outstandingPayable' } } },
    ]);
    const totalSupplierPayables = supplierAgg.length > 0 ? supplierAgg[0].totalPayable : 0;

    // Current Inventory Valuation & Low Stock
    const allProducts = await Product.find({ isActive: true });
    let inventoryValuation = 0;
    const lowStockProducts = [];

    allProducts.forEach((p) => {
      inventoryValuation += p.currentStock * p.costPrice;
      if (p.currentStock <= p.minStockLevel) {
        lowStockProducts.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          category: p.category,
          currentStock: p.currentStock,
          minStockLevel: p.minStockLevel,
        });
      }
    });

    // Expiring Batches in next 30 days
    const expiringBatches = await ProductionBatch.find({
      expiryDate: { $gte: new Date(), $lte: thirtyDaysAhead },
      status: 'completed',
    }).populate('product', 'name sku');

    // 2. Sales Trend (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekOrders = await Order.find({
      orderDate: { $gte: sevenDaysAgo },
      orderStatus: { $ne: 'cancelled' },
    });

    const salesTrend = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTotal = pastWeekOrders
        .filter((o) => new Date(o.orderDate) >= dayStart && new Date(o.orderDate) <= dayEnd)
        .reduce((sum, o) => sum + o.grandTotal, 0);

      salesTrend.push({ date: dayLabel, sales: dayTotal });
    }

    // 3. Estimated Monthly Profit (Last 30 Days)
    const recentOrders = await Order.find({
      orderDate: { $gte: thirtyDaysAgo },
      orderStatus: { $ne: 'cancelled' },
    });
    const monthlyRevenue = recentOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    const recentExpenses = await Expense.find({
      date: { $gte: thirtyDaysAgo },
    });
    const monthlyExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Rough COGS estimate from line item products (or 65% of revenue if not filled)
    let cogs = 0;
    for (const ord of recentOrders) {
      for (const item of ord.items) {
        const prodId = item.product?._id ? item.product._id.toString() : item.product?.toString();
        const prod = prodId ? allProducts.find((p) => p._id.toString() === prodId) : null;
        const cost = prod ? prod.costPrice : (item.unitPrice || 0) * 0.65;
        cogs += (item.quantity || 0) * cost;
      }
    }
    const estimatedProfit = Math.max(0, monthlyRevenue - cogs - monthlyExpenses);

    // 4. Top Selling Products
    const productSalesMap = {};
    recentOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.name;
        productSalesMap[key] = (productSalesMap[key] || 0) + item.quantity;
      });
    });

    const topSellingProducts = Object.entries(productSalesMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 5. Top Dealers/Customers
    const topDealers = await Customer.find({ status: 'active' })
      .sort('-totalPurchases')
      .limit(5)
      .select('name area customerType totalPurchases outstandingAmount');

    // 6. Overdue Dealers (dealers with dues)
    const overdueDealers = await Customer.find({
      outstandingAmount: { $gt: 0 },
    })
      .sort('-outstandingAmount')
      .limit(5)
      .select('name phone area outstandingAmount creditLimit paymentTermsDays');

    return successResponse(res, 200, 'Dashboard overview calculated', {
      today: {
        sales: todaySales,
        ordersCount: todayOrderCount,
        productionQty: todayProductionQty,
        expenses: todayExpenses,
        paymentsReceived: todayPaymentsReceived,
        workersPresent: presentCount,
        pendingOrders: pendingOrdersCount,
        pendingPurchases: pendingPurchasesCount,
      },
      financials: {
        inventoryValuation,
        totalCustomerDues,
        totalSupplierPayables,
        monthlyRevenue,
        monthlyExpenses,
        estimatedProfit,
      },
      alerts: {
        lowStockProducts,
        lowStockCount: lowStockProducts.length,
        expiringBatches,
        expiringBatchesCount: expiringBatches.length,
        overdueDealers,
        pendingOrdersCount,
      },
      analytics: {
        salesTrend,
        topSellingProducts,
        topDealers,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
