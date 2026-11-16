const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

// Generate unique sequential order number: SO-YYYY-XXXX
const generateOrderNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Order.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  let orderNumber = `SO-${currentYear}-${sequence}`;

  // Ensure uniqueness
  let exists = await Order.findOne({ orderNumber });
  let counter = 1;
  while (exists) {
    orderNumber = `SO-${currentYear}-${String(count + 1 + counter).padStart(4, '0')}`;
    exists = await Order.findOne({ orderNumber });
    counter++;
  }
  return orderNumber;
};

// Helper: deduct stock for order items
const deductOrderStock = async (order, userId) => {
  if (order.stockDeducted) return;

  // 1. Verify stock availability for all items first to prevent partial stock deduction
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product ${item.name} not found`);
    }
    if (product.currentStock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Required: ${item.quantity}, Available: ${product.currentStock}`
      );
    }
  }

  // 2. Perform atomic stock deduction & log transaction
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    const previousStock = product.currentStock;
    product.currentStock -= item.quantity;
    await product.save();

    await InventoryTransaction.create({
      product: product._id,
      type: 'sale',
      quantity: -item.quantity,
      previousStock,
      newStock: product.currentStock,
      referenceId: order._id,
      referenceModel: 'Order',
      notes: `Order ${order.orderNumber}`,
      createdBy: userId,
    });

    if (product.currentStock <= product.minStockLevel) {
      await Notification.create({
        title: `Low Stock: ${product.name}`,
        message: `Stock fell to ${product.currentStock} ${product.unit} after Order ${order.orderNumber}`,
        type: 'low_stock',
        link: '/inventory',
      });
    }
  }

  order.stockDeducted = true;
  await order.save();
};

// Helper: restore stock for cancelled order
const restoreOrderStock = async (order, userId) => {
  if (!order.stockDeducted) return;

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const previousStock = product.currentStock;
      product.currentStock += item.quantity;
      await product.save();

      await InventoryTransaction.create({
        product: product._id,
        type: 'order_cancelled',
        quantity: item.quantity,
        previousStock,
        newStock: product.currentStock,
        referenceId: order._id,
        referenceModel: 'Order',
        notes: `Cancelled Order ${order.orderNumber}`,
        createdBy: userId,
      });
    }
  }

  order.stockDeducted = false;
  await order.save();
};

exports.getAllOrders = async (req, res) => {
  try {
    const {
      customerId,
      orderStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (customerId) query.customer = customerId;
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'name phone area customerType')
      .populate('createdBy', 'name role')
      .sort('-orderDate')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Orders retrieved', orders, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name role');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    return successResponse(res, 200, 'Order details retrieved', order);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createOrder = async (req, res) => {
  try {
    const {
      customer: customerId,
      items,
      discount = 0,
      taxRate = 5,
      notes = '',
      orderStatus = 'pending',
      deliveryAddress = '',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'At least one item is required in the order');
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    if (customer.status === 'blocked') {
      return errorResponse(res, 400, 'This customer account is blocked from placing orders');
    }

    // Process line items & check pricing/stock
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return errorResponse(res, 400, `Product not found with id ${item.product}`);
      }

      const qty = Number(item.quantity);
      if (qty <= 0) {
        return errorResponse(res, 400, `Invalid quantity for ${product.name}`);
      }

      // Check stock if immediate deduction is expected
      if (['packed', 'dispatched', 'delivered'].includes(orderStatus) && product.currentStock < qty) {
        return errorResponse(
          res,
          400,
          `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${qty}`
        );
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : product.sellingPrice;
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice,
        total: lineTotal,
      });
    }

    const discountAmount = Number(discount) || 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableAmount * Number(taxRate)) / 100;
    const grandTotal = Math.round(taxableAmount + taxAmount);
    const dueAmount = grandTotal;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: customerId,
      items: processedItems,
      subtotal,
      discount: discountAmount,
      taxRate: Number(taxRate),
      taxAmount,
      grandTotal,
      paidAmount: 0,
      dueAmount,
      paymentStatus: 'unpaid',
      orderStatus,
      deliveryAddress: deliveryAddress || customer.address,
      notes,
      stockDeducted: false,
      createdBy: req.user._id,
    });

    // Update customer balances
    customer.totalPurchases += grandTotal;
    customer.outstandingAmount += grandTotal;
    await customer.save();

    // Deduct stock if order is created in packed/dispatched/delivered state
    if (['packed', 'dispatched', 'delivered'].includes(orderStatus)) {
      await deductOrderStock(order, req.user._id);
    }

    await logAudit({
      action: 'ORDER_CREATED',
      entity: 'Order',
      entityId: order._id,
      user: req.user,
      newState: order.toObject(),
      details: `Created Order ${order.orderNumber} for ₹${grandTotal}`,
      req,
    });

    return successResponse(res, 201, 'Order created successfully', order);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'dispatched',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(id);
    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    const previousStatus = order.orderStatus;
    if (previousStatus === status) {
      return successResponse(res, 200, 'Order status unchanged', order);
    }

    // Cancellation handling
    if (status === 'cancelled') {
      if (order.stockDeducted) {
        await restoreOrderStock(order, req.user._id);
      }
      // Revert customer outstanding balances
      const customer = await Customer.findById(order.customer);
      if (customer) {
        customer.totalPurchases = Math.max(0, customer.totalPurchases - order.grandTotal);
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - order.dueAmount);
        await customer.save();
      }
      order.orderStatus = 'cancelled';
      await order.save();

      await logAudit({
        action: 'ORDER_CANCELLED',
        entity: 'Order',
        entityId: order._id,
        user: req.user,
        details: `Cancelled Order ${order.orderNumber}`,
        req,
      });

      return successResponse(res, 200, 'Order cancelled and stock restored', order);
    }

    // If changing to packed, dispatched, or delivered, deduct stock if not already done
    if (['packed', 'dispatched', 'delivered'].includes(status) && !order.stockDeducted) {
      await deductOrderStock(order, req.user._id);
    }

    order.orderStatus = status;
    await order.save();

    await logAudit({
      action: 'ORDER_STATUS_UPDATED',
      entity: 'Order',
      entityId: order._id,
      user: req.user,
      previousState: { orderStatus: previousStatus },
      newState: { orderStatus: status },
      details: `Order ${order.orderNumber} status changed from ${previousStatus} to ${status}`,
      req,
    });

    return successResponse(res, 200, `Order status updated to ${status}`, order);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
