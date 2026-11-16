const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      lowStock,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('supplier', 'name phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Products retrieved', products, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier');
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const transactions = await InventoryTransaction.find({ product: product._id })
      .populate('createdBy', 'name role')
      .sort('-createdAt')
      .limit(25);

    return successResponse(res, 200, 'Product details retrieved', {
      product,
      transactions,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      subcategory,
      unit,
      costPrice,
      sellingPrice,
      minStockLevel,
      currentStock = 0,
      supplier,
      batchNumber,
      expiryDate,
      description,
    } = req.body;

    if (!name || !sku) {
      return errorResponse(res, 400, 'Product name and SKU are required');
    }

    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      return errorResponse(res, 400, `SKU '${sku}' is already in use`);
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      category,
      subcategory,
      unit,
      costPrice,
      sellingPrice: category === 'finished_good' ? sellingPrice : 0,
      minStockLevel,
      currentStock,
      supplier: supplier || null,
      batchNumber,
      expiryDate,
      description,
    });

    if (currentStock > 0) {
      await InventoryTransaction.create({
        product: product._id,
        type: 'adjustment',
        quantity: currentStock,
        previousStock: 0,
        newStock: currentStock,
        notes: 'Initial stock on creation',
        createdBy: req.user._id,
      });
    }

    await logAudit({
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product._id,
      user: req.user,
      newState: product.toObject(),
      req,
    });

    return successResponse(res, 201, 'Product created successfully', product);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const previousState = product.toObject();

    // Prevent direct arbitrary stock edits through update; use adjustStock for stock
    const allowedFields = [
      'name',
      'subcategory',
      'unit',
      'costPrice',
      'sellingPrice',
      'minStockLevel',
      'supplier',
      'batchNumber',
      'expiryDate',
      'description',
      'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    await logAudit({
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: product._id,
      user: req.user,
      previousState,
      newState: product.toObject(),
      req,
    });

    return successResponse(res, 200, 'Product updated successfully', product);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange, type = 'adjustment', notes = '' } = req.body;

    if (!quantityChange || isNaN(quantityChange)) {
      return errorResponse(res, 400, 'Please provide a valid numeric quantityChange (+/-)');
    }

    const product = await Product.findById(id);
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + Number(quantityChange);

    if (newStock < 0) {
      return errorResponse(res, 400, `Cannot adjust stock below 0. Current stock is ${previousStock}`);
    }

    product.currentStock = newStock;
    await product.save();

    const transaction = await InventoryTransaction.create({
      product: product._id,
      type: type || 'adjustment',
      quantity: Number(quantityChange),
      previousStock,
      newStock,
      notes,
      createdBy: req.user._id,
    });

    // Check low stock notification
    if (newStock <= product.minStockLevel) {
      await Notification.create({
        title: `Low Stock: ${product.name}`,
        message: `Current stock (${newStock} ${product.unit}) is at or below minimum threshold (${product.minStockLevel} ${product.unit}).`,
        type: 'low_stock',
        link: `/inventory`,
      });
    }

    await logAudit({
      action: 'STOCK_MANUALLY_ADJUSTED',
      entity: 'Product',
      entityId: product._id,
      user: req.user,
      previousState: { stock: previousStock },
      newState: { stock: newStock },
      details: `Quantity change: ${quantityChange}. Reason: ${notes}`,
      req,
    });

    return successResponse(res, 200, 'Stock adjusted successfully', {
      product,
      transaction,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    }).populate('supplier', 'name phone');

    return successResponse(res, 200, 'Low stock products retrieved', lowStockProducts);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getInventoryValuation = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    let finishedGoodsValue = 0;
    let rawMaterialsValue = 0;
    let totalItems = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const val = p.currentStock * p.costPrice;
      totalItems += p.currentStock;
      if (p.category === 'finished_good') {
        finishedGoodsValue += val;
      } else {
        rawMaterialsValue += val;
      }
      if (p.currentStock <= p.minStockLevel) {
        lowStockCount++;
      }
    });

    return successResponse(res, 200, 'Inventory valuation calculated', {
      finishedGoodsValue,
      rawMaterialsValue,
      totalValuation: finishedGoodsValue + rawMaterialsValue,
      totalProductsCount: products.length,
      lowStockCount,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 50 } = req.query;
    const query = {};

    if (productId) query.product = productId;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await InventoryTransaction.countDocuments(query);
    const transactions = await InventoryTransaction.find(query)
      .populate('product', 'name sku unit category')
      .populate('createdBy', 'name role')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Transactions retrieved', transactions, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
