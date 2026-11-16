const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['finished_good', 'raw_material'],
      required: [true, 'Category is required (finished_good or raw_material)'],
    },
    subcategory: {
      type: String,
      trim: true,
      default: 'General',
    },
    unit: {
      type: String,
      enum: ['packet', 'kg', 'g', 'box', 'carton', 'piece', 'bag'],
      required: [true, 'Unit of measurement is required'],
      default: 'packet',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      min: [0, 'Selling price cannot be negative'],
      default: 0,
    },
    minStockLevel: {
      type: Number,
      required: [true, 'Minimum stock level is required'],
      min: [0, 'Minimum stock cannot be negative'],
      default: 10,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ currentStock: 1, minStockLevel: 1 });

module.exports = mongoose.model('Product', productSchema);
