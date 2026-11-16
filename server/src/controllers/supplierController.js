const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

exports.getAllSuppliers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort('name');
    return successResponse(res, 200, 'Suppliers retrieved', suppliers);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const recentPurchases = await Purchase.find({ supplier: supplier._id })
      .sort('-purchaseDate')
      .limit(10);

    const recentPayments = await Payment.find({ partyId: supplier._id })
      .sort('-paymentDate')
      .limit(10);

    return successResponse(res, 200, 'Supplier details retrieved', {
      supplier,
      recentPurchases,
      recentPayments,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, gstNumber, paymentTermsDays, notes } = req.body;

    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      paymentTermsDays: paymentTermsDays || 30,
      notes,
    });

    await logAudit({
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier._id,
      user: req.user,
      newState: supplier.toObject(),
      req,
    });

    return successResponse(res, 201, 'Supplier created', supplier);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const previousState = supplier.toObject();
    const allowed = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstNumber', 'paymentTermsDays', 'status', 'notes'];

    allowed.forEach((f) => {
      if (req.body[f] !== undefined) supplier[f] = req.body[f];
    });

    await supplier.save();

    await logAudit({
      action: 'SUPPLIER_UPDATED',
      entity: 'Supplier',
      entityId: supplier._id,
      user: req.user,
      previousState,
      newState: supplier.toObject(),
      req,
    });

    return successResponse(res, 200, 'Supplier updated', supplier);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const purchases = await Purchase.find({ supplier: id, status: { $ne: 'cancelled' } }).sort('purchaseDate');
    const payments = await Payment.find({ partyId: id, partyType: 'supplier' }).sort('paymentDate');

    const transactions = [];

    purchases.forEach((p) => {
      transactions.push({
        date: p.purchaseDate,
        type: 'PURCHASE_BILL',
        reference: p.purchaseNumber,
        referenceId: p._id,
        payableAmount: p.totalAmount, // we owe supplier
        paidAmount: 0,
        notes: `PO ${p.purchaseNumber} (Inv: ${p.supplierInvoiceNo || 'N/A'})`,
      });
    });

    payments.forEach((pay) => {
      transactions.push({
        date: pay.paymentDate,
        type: 'PAYMENT_TO_SUPPLIER',
        reference: pay.receiptNumber,
        referenceId: pay._id,
        payableAmount: 0,
        paidAmount: pay.amount, // we paid supplier
        notes: `Payment via ${pay.paymentMethod}`,
      });
    });

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningPayable = 0;
    const ledger = transactions.map((t) => {
      runningPayable += t.payableAmount - t.paidAmount;
      return {
        ...t,
        balance: runningPayable,
      };
    });

    return successResponse(res, 200, 'Supplier ledger generated', {
      supplier: {
        _id: supplier._id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        outstandingPayable: supplier.outstandingPayable,
      },
      ledger,
      summary: {
        totalPurchases: ledger.reduce((acc, l) => acc + l.payableAmount, 0),
        totalPaid: ledger.reduce((acc, l) => acc + l.paidAmount, 0),
        closingPayable: runningPayable,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
