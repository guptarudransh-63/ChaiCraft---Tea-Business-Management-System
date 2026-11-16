const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductionBatch = require('../models/ProductionBatch');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { orderStatus: { $ne: 'cancelled' } };

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    const orders = await Order.find(query).populate('customer', 'name area customerType');

    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalDue = orders.reduce((sum, o) => sum + o.dueAmount, 0);

    const productSales = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSales[item.name]) {
          productSales[item.name] = { quantity: 0, revenue: 0, sku: item.sku };
        }
        productSales[item.name].quantity += item.quantity;
        productSales[item.name].revenue += item.total;
      });
    });

    return successResponse(res, 200, 'Sales report generated', {
      summary: {
        orderCount: orders.length,
        totalRevenue,
        totalCollected,
        totalDue,
      },
      productBreakdown: Object.entries(productSales).map(([productName, data]) => ({
        productName,
        sku: data.sku,
        quantity: data.quantity,
        revenue: data.revenue,
      })),
      orders,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).populate('supplier', 'name');

    let totalValuation = 0;
    let finishedValuation = 0;
    let rawValuation = 0;

    const list = products.map((p) => {
      const val = p.currentStock * p.costPrice;
      totalValuation += val;
      if (p.category === 'finished_good') finishedValuation += val;
      else rawValuation += val;

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        currentStock: p.currentStock,
        minStockLevel: p.minStockLevel,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        valuation: val,
        isLowStock: p.currentStock <= p.minStockLevel,
        supplier: p.supplier?.name || 'N/A',
      };
    });

    return successResponse(res, 200, 'Inventory valuation report', {
      summary: {
        totalProducts: products.length,
        totalValuation,
        finishedValuation,
        rawValuation,
        lowStockItemsCount: list.filter((p) => p.isLowStock).length,
      },
      products: list,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getDuesReport = async (req, res) => {
  try {
    const customersWithDues = await Customer.find({ outstandingAmount: { $gt: 0 } })
      .populate('assignedSalesperson', 'name')
      .sort('-outstandingAmount');

    const totalOutstanding = customersWithDues.reduce((sum, c) => sum + c.outstandingAmount, 0);

    return successResponse(res, 200, 'Customer dues and credit report', {
      totalOutstanding,
      customerCount: customersWithDues.length,
      customers: customersWithDues,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
