const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitCost: {
      type: Number,
      required: true,
      min: [0, 'Unit cost cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: [true, 'Purchase order number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    supplierInvoiceNo: {
      type: String,
      trim: true,
      default: '',
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    items: [purchaseItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['ordered', 'received', 'cancelled'],
      default: 'ordered',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    receivedDate: {
      type: Date,
      default: null,
    },
    stockAdded: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ supplier: 1, purchaseDate: -1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
