const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const Purchase = require('../models/Purchase');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

const generateReceiptNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Payment.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  let receiptNumber = `REC-${currentYear}-${sequence}`;

  let exists = await Payment.findOne({ receiptNumber });
  let counter = 1;
  while (exists) {
    receiptNumber = `REC-${currentYear}-${String(count + 1 + counter).padStart(4, '0')}`;
    exists = await Payment.findOne({ receiptNumber });
    counter++;
  }
  return receiptNumber;
};

exports.getAllPayments = async (req, res) => {
  try {
    const { partyType, partyId, paymentMethod, page = 1, limit = 50 } = req.query;
    const query = {};

    if (partyType) query.partyType = partyType;
    if (partyId) query.partyId = partyId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('order', 'orderNumber grandTotal dueAmount')
      .populate('purchase', 'purchaseNumber totalAmount dueAmount')
      .populate('createdBy', 'name role')
      .sort('-paymentDate')
      .skip(skip)
      .limit(parseInt(limit));

    // Manually populate party details depending on partyModel
    const populatedPayments = await Promise.all(
      payments.map(async (p) => {
        const obj = p.toObject();
        if (p.partyType === 'customer') {
          const cust = await Customer.findById(p.partyId).select('name phone area');
          obj.party = cust;
        } else {
          const supp = await Supplier.findById(p.partyId).select('name phone contactPerson');
          obj.party = supp;
        }
        return obj;
      })
    );

    return successResponse(res, 200, 'Payments retrieved', populatedPayments, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const {
      partyType, // 'customer' or 'supplier'
      partyId,
      orderId,
      purchaseId,
      amount,
      paymentMethod = 'bank_transfer',
      referenceNumber = '',
      paymentDate,
      notes = '',
    } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return errorResponse(res, 400, 'Payment amount must be greater than zero');
    }

    let previousDue = 0;
    let remainingDue = 0;

    if (partyType === 'customer') {
      const customer = await Customer.findById(partyId);
      if (!customer) {
        return errorResponse(res, 404, 'Customer not found');
      }

      previousDue = customer.outstandingAmount;
      customer.totalPaid += payAmount;
      customer.outstandingAmount = Math.max(0, customer.outstandingAmount - payAmount);
      remainingDue = customer.outstandingAmount;
      await customer.save();

      // If tied to a specific order, update order payment status
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.paidAmount += payAmount;
          order.dueAmount = Math.max(0, order.grandTotal - order.paidAmount);
          order.paymentStatus = order.dueAmount === 0 ? 'paid' : order.paidAmount > 0 ? 'partial' : 'unpaid';
          await order.save();
        }
      }
    } else if (partyType === 'supplier') {
      const supplier = await Supplier.findById(partyId);
      if (!supplier) {
        return errorResponse(res, 404, 'Supplier not found');
      }

      previousDue = supplier.outstandingPayable;
      supplier.totalPaid += payAmount;
      supplier.outstandingPayable = Math.max(0, supplier.outstandingPayable - payAmount);
      remainingDue = supplier.outstandingPayable;
      await supplier.save();

      // If tied to a specific purchase, update purchase payment status
      if (purchaseId) {
        const purchase = await Purchase.findById(purchaseId);
        if (purchase) {
          purchase.paidAmount += payAmount;
          purchase.dueAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount);
          purchase.paymentStatus = purchase.dueAmount === 0 ? 'paid' : purchase.paidAmount > 0 ? 'partial' : 'unpaid';
          await purchase.save();
        }
      }
    } else {
      return errorResponse(res, 400, 'Invalid partyType. Must be "customer" or "supplier"');
    }

    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      partyType,
      partyId,
      partyModel: partyType === 'customer' ? 'Customer' : 'Supplier',
      order: orderId || null,
      purchase: purchaseId || null,
      amount: payAmount,
      paymentMethod,
      referenceNumber,
      paymentDate: paymentDate || new Date(),
      previousDue,
      remainingDue,
      notes,
      createdBy: req.user._id,
    });

    await logAudit({
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment._id,
      user: req.user,
      newState: payment.toObject(),
      details: `Recorded ₹${payAmount} payment for ${partyType} (Receipt: ${receiptNumber})`,
      req,
    });

    return successResponse(res, 201, 'Payment recorded successfully', payment);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
