const ProductionBatch = require('../models/ProductionBatch');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

const generateBatchNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await ProductionBatch.countDocuments();
  const sequence = String(count + 1).padStart(3, '0');
  let batchNumber = `TB-${currentYear}-${sequence}`;

  let exists = await ProductionBatch.findOne({ batchNumber });
  let counter = 1;
  while (exists) {
    batchNumber = `TB-${currentYear}-${String(count + 1 + counter).padStart(3, '0')}`;
    exists = await ProductionBatch.findOne({ batchNumber });
    counter++;
  }
  return batchNumber;
};

exports.getAllBatches = async (req, res) => {
  try {
    const { status, productId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (productId) query.product = productId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ProductionBatch.countDocuments(query);
    const batches = await ProductionBatch.find(query)
      .populate('product', 'name sku unit category currentStock')
      .populate('workers', 'name role department')
      .populate('rawMaterialsConsumed.product', 'name sku unit currentStock')
      .populate('createdBy', 'name role')
      .sort('-productionDate')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Batches retrieved', batches, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await ProductionBatch.findById(req.params.id)
      .populate('product')
      .populate('workers')
      .populate('rawMaterialsConsumed.product')
      .populate('createdBy', 'name role');

    if (!batch) {
      return errorResponse(res, 404, 'Batch not found');
    }

    return successResponse(res, 200, 'Batch details retrieved', batch);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createBatch = async (req, res) => {
  try {
    const {
      product: productId,
      plannedQuantity,
      producedQuantity = 0,
      productionDate,
      expiryDate,
      workers = [],
      rawMaterialsConsumed = [],
      notes = '',
      status = 'planned',
    } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.category !== 'finished_good') {
      return errorResponse(res, 400, 'Valid finished tea product is required for production');
    }

    const batchNumber = await generateBatchNumber();

    const batch = await ProductionBatch.create({
      batchNumber,
      product: productId,
      plannedQuantity: Number(plannedQuantity),
      producedQuantity: Number(producedQuantity) || 0,
      productionDate: productionDate || new Date(),
      expiryDate: expiryDate || null,
      workers,
      rawMaterialsConsumed,
      notes,
      status,
      createdBy: req.user._id,
    });

    // If batch created directly in completed status, process inventory changes
    if (status === 'completed' && producedQuantity > 0) {
      await exports.completeBatchInventory(batch, req.user);
    }

    await logAudit({
      action: 'PRODUCTION_BATCH_CREATED',
      entity: 'ProductionBatch',
      entityId: batch._id,
      user: req.user,
      newState: batch.toObject(),
      details: `Created batch ${batchNumber} for ${product.name}`,
      req,
    });

    return successResponse(res, 201, 'Production batch created', batch);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// Internal helper for inventory completion
exports.completeBatchInventory = async (batch, user) => {
  // 1. Check raw materials stock availability first
  if (batch.rawMaterialsConsumed && batch.rawMaterialsConsumed.length > 0) {
    for (const rm of batch.rawMaterialsConsumed) {
      const rawProduct = await Product.findById(rm.product);
      if (rawProduct) {
        if (rawProduct.currentStock < rm.quantity) {
          throw new Error(
            `Insufficient raw material: "${rawProduct.name}". Required: ${rm.quantity}, Available: ${rawProduct.currentStock}`
          );
        }
      }
    }
  }

  // 2. Consume raw materials
  if (batch.rawMaterialsConsumed && batch.rawMaterialsConsumed.length > 0) {
    for (const rm of batch.rawMaterialsConsumed) {
      const rawProduct = await Product.findById(rm.product);
      if (rawProduct) {
        const previousStock = rawProduct.currentStock;
        rawProduct.currentStock -= rm.quantity;
        await rawProduct.save();

        await InventoryTransaction.create({
          product: rawProduct._id,
          type: 'production_consumed',
          quantity: -rm.quantity,
          previousStock,
          newStock: rawProduct.currentStock,
          referenceId: batch._id,
          referenceModel: 'ProductionBatch',
          notes: `Consumed for Batch ${batch.batchNumber}`,
          createdBy: user._id,
        });
      }
    }
  }

  // 3. Increase finished good inventory
  const finishedProduct = await Product.findById(batch.product);
  if (finishedProduct) {
    const previousStock = finishedProduct.currentStock;
    finishedProduct.currentStock += batch.producedQuantity;
    finishedProduct.batchNumber = batch.batchNumber;
    if (batch.expiryDate) {
      finishedProduct.expiryDate = batch.expiryDate;
    }
    await finishedProduct.save();

    await InventoryTransaction.create({
      product: finishedProduct._id,
      type: 'production_in',
      quantity: batch.producedQuantity,
      previousStock,
      newStock: finishedProduct.currentStock,
      referenceId: batch._id,
      referenceModel: 'ProductionBatch',
      notes: `Produced in Batch ${batch.batchNumber}`,
      createdBy: user._id,
    });
  }

  batch.completedAt = new Date();
  await batch.save();

  await Notification.create({
    title: `Production Completed: ${batch.batchNumber}`,
    message: `Batch ${batch.batchNumber} produced ${batch.producedQuantity} units of ${finishedProduct?.name || 'tea'}.`,
    type: 'production_alert',
    link: '/production',
  });
};

exports.updateBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, producedQuantity, notes } = req.body;

    const batch = await ProductionBatch.findById(id).populate('product');
    if (!batch) {
      return errorResponse(res, 404, 'Batch not found');
    }

    if (batch.status === 'completed') {
      return errorResponse(res, 400, 'Completed batch cannot be modified');
    }

    if (producedQuantity !== undefined) {
      batch.producedQuantity = Number(producedQuantity);
    }
    if (notes !== undefined) {
      batch.notes = notes;
    }

    if (status === 'completed') {
      if (batch.producedQuantity <= 0) {
        return errorResponse(res, 400, 'Produced quantity must be greater than zero to complete batch');
      }
      batch.status = 'completed';
      await exports.completeBatchInventory(batch, req.user);
    } else {
      batch.status = status;
      await batch.save();
    }

    await logAudit({
      action: 'BATCH_STATUS_UPDATED',
      entity: 'ProductionBatch',
      entityId: batch._id,
      user: req.user,
      newState: { status: batch.status, producedQuantity: batch.producedQuantity },
      details: `Batch ${batch.batchNumber} status set to ${status}`,
      req,
    });

    return successResponse(res, 200, `Batch updated to ${batch.status}`, batch);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
