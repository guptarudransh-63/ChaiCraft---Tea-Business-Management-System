const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

exports.getAllCustomers = async (req, res) => {
  try {
    const {
      type,
      search,
      status,
      hasDue,
      assignedSalesperson,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const query = {};

    if (type) query.customerType = type;
    if (status) query.status = status;
    if (assignedSalesperson) query.assignedSalesperson = assignedSalesperson;
    if (hasDue === 'true') {
      query.outstandingAmount = { $gt: 0 };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate('assignedSalesperson', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Customers retrieved', customers, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('assignedSalesperson', 'name email');
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const recentOrders = await Order.find({ customer: customer._id })
      .sort('-orderDate')
      .limit(10);

    const recentPayments = await Payment.find({ partyId: customer._id })
      .sort('-paymentDate')
      .limit(10);

    return successResponse(res, 200, 'Customer details retrieved', {
      customer,
      recentOrders,
      recentPayments,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      area,
      customerType,
      creditLimit,
      paymentTermsDays,
      gstNumber,
      assignedSalesperson,
      notes,
    } = req.body;

    const customer = await Customer.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      area,
      customerType: customerType || 'retailer',
      creditLimit: creditLimit || 50000,
      paymentTermsDays: paymentTermsDays || 15,
      gstNumber,
      assignedSalesperson: assignedSalesperson || (req.user.role === 'sales' ? req.user._id : null),
      notes,
    });

    await logAudit({
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer._id,
      user: req.user,
      newState: customer.toObject(),
      req,
    });

    return successResponse(res, 201, 'Customer created successfully', customer);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const previousState = customer.toObject();

    // Prevent direct override of financial balances through update endpoint
    const allowed = [
      'name',
      'contactPerson',
      'phone',
      'email',
      'address',
      'area',
      'customerType',
      'creditLimit',
      'paymentTermsDays',
      'gstNumber',
      'assignedSalesperson',
      'status',
      'notes',
    ];

    allowed.forEach((f) => {
      if (req.body[f] !== undefined) customer[f] = req.body[f];
    });

    await customer.save();

    await logAudit({
      action: 'CUSTOMER_UPDATED',
      entity: 'Customer',
      entityId: customer._id,
      user: req.user,
      previousState,
      newState: customer.toObject(),
      req,
    });

    return successResponse(res, 200, 'Customer updated successfully', customer);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const orders = await Order.find({ customer: id, orderStatus: { $ne: 'cancelled' } }).sort('orderDate');
    const payments = await Payment.find({ partyId: id, partyType: 'customer' }).sort('paymentDate');

    // Combine into unified chronological ledger
    const transactions = [];

    orders.forEach((o) => {
      transactions.push({
        date: o.orderDate,
        type: 'SALE_INVOICE',
        reference: o.orderNumber,
        referenceId: o._id,
        debit: o.grandTotal, // customer owes this
        credit: 0,
        notes: `Order for ${o.items.length} items (${o.orderStatus})`,
      });
    });

    payments.forEach((p) => {
      transactions.push({
        date: p.paymentDate,
        type: 'PAYMENT_RECEIVED',
        reference: p.receiptNumber,
        referenceId: p._id,
        debit: 0,
        credit: p.amount, // customer paid this
        notes: `Payment via ${p.paymentMethod} (Ref: ${p.referenceNumber || 'N/A'})`,
      });
    });

    // Sort chronologically
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledger = transactions.map((t) => {
      runningBalance += t.debit - t.credit;
      return {
        ...t,
        balance: runningBalance,
      };
    });

    return successResponse(res, 200, 'Customer ledger generated', {
      customer: {
        _id: customer._id,
        name: customer.name,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        creditLimit: customer.creditLimit,
        paymentTermsDays: customer.paymentTermsDays,
        currentOutstanding: customer.outstandingAmount,
      },
      ledger,
      summary: {
        totalDebit: ledger.reduce((acc, l) => acc + l.debit, 0),
        totalCredit: ledger.reduce((acc, l) => acc + l.credit, 0),
        closingBalance: runningBalance,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
