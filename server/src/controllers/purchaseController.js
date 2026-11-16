const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

const generatePurchaseNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Purchase.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  let purchaseNumber = `PO-${currentYear}-${sequence}`;

  let exists = await Purchase.findOne({ purchaseNumber });
  let counter = 1;
  while (exists) {
    purchaseNumber = `PO-${currentYear}-${String(count + 1 + counter).padStart(4, '0')}`;
    exists = await Purchase.findOne({ purchaseNumber });
    counter++;
  }
  return purchaseNumber;
};

// Process inventory stock increment when purchase is received
const addPurchaseStock = async (purchase, userId) => {
  if (purchase.stockAdded) return;

  for (const item of purchase.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const previousStock = product.currentStock;
      product.currentStock += item.quantity;
      if (item.unitCost > 0) {
        product.costPrice = item.unitCost; // Update latest cost
      }
      await product.save();

      await InventoryTransaction.create({
        product: product._id,
        type: 'purchase',
        quantity: item.quantity,
        previousStock,
        newStock: product.currentStock,
        referenceId: purchase._id,
        referenceModel: 'Purchase',
        notes: `Purchase ${purchase.purchaseNumber}`,
        createdBy: userId,
      });
    }
  }

  purchase.stockAdded = true;
  purchase.receivedDate = new Date();
  await purchase.save();
};

exports.getAllPurchases = async (req, res) => {
  try {
    const { supplierId, status, paymentStatus, page = 1, limit = 20 } = req.query;
    const query = {};

    if (supplierId) query.supplier = supplierId;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .populate('supplier', 'name phone contactPerson')
      .populate('createdBy', 'name role')
      .sort('-purchaseDate')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Purchases retrieved', purchases, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('createdBy', 'name role');

    if (!purchase) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    return successResponse(res, 200, 'Purchase details retrieved', purchase);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const {
      supplier: supplierId,
      supplierInvoiceNo = '',
      items,
      notes = '',
      status = 'ordered',
      purchaseDate,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'At least one item is required in the purchase');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return errorResponse(res, 400, `Product not found with id ${item.product}`);
      }

      const qty = Number(item.quantity);
      const unitCost = Number(item.unitCost) || product.costPrice;
      const lineTotal = qty * unitCost;
      totalAmount += lineTotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        unitCost,
        total: lineTotal,
      });
    }

    const purchaseNumber = await generatePurchaseNumber();

    const purchase = await Purchase.create({
      purchaseNumber,
      supplierInvoiceNo,
      supplier: supplierId,
      items: processedItems,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      paymentStatus: 'unpaid',
      status,
      purchaseDate: purchaseDate || new Date(),
      stockAdded: false,
      notes,
      createdBy: req.user._id,
    });

    // Update supplier outstanding payables
    supplier.totalPurchased += totalAmount;
    supplier.outstandingPayable += totalAmount;
    await supplier.save();

    // If marked received upon creation, add stock immediately
    if (status === 'received') {
      await addPurchaseStock(purchase, req.user._id);
    }

    await logAudit({
      action: 'PURCHASE_CREATED',
      entity: 'Purchase',
      entityId: purchase._id,
      user: req.user,
      newState: purchase.toObject(),
      details: `Created Purchase ${purchaseNumber} from ${supplier.name} for ₹${totalAmount}`,
      req,
    });

    return successResponse(res, 201, 'Purchase order created successfully', purchase);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, supplierInvoiceNo } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (supplierInvoiceNo) {
      purchase.supplierInvoiceNo = supplierInvoiceNo;
    }

    if (status === 'received' && !purchase.stockAdded) {
      purchase.status = 'received';
      await addPurchaseStock(purchase, req.user._id);
    } else if (status) {
      purchase.status = status;
      await purchase.save();
    }

    await logAudit({
      action: 'PURCHASE_STATUS_UPDATED',
      entity: 'Purchase',
      entityId: purchase._id,
      user: req.user,
      newState: { status: purchase.status },
      details: `Purchase ${purchase.purchaseNumber} status updated to ${purchase.status}`,
      req,
    });

    return successResponse(res, 200, `Purchase updated to ${purchase.status}`, purchase);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
