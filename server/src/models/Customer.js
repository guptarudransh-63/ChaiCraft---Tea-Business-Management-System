const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer/Business name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      default: 'General',
    },
    customerType: {
      type: String,
      enum: ['distributor', 'wholesaler', 'retailer', 'direct', 'other'],
      default: 'retailer',
    },
    creditLimit: {
      type: Number,
      default: 50000,
      min: 0,
    },
    paymentTermsDays: {
      type: Number,
      default: 15,
      min: 0,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: '',
    },
    assignedSalesperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ phone: 1 });
customerSchema.index({ name: 'text', area: 'text' });
customerSchema.index({ customerType: 1 });
customerSchema.index({ outstandingAmount: -1 });

module.exports = mongoose.model('Customer', customerSchema);
