const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    partyType: {
      type: String,
      enum: ['customer', 'supplier'],
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'partyModel',
    },
    partyModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Supplier'],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      required: true,
      default: 'bank_transfer',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    previousDue: {
      type: Number,
      default: 0,
    },
    remainingDue: {
      type: Number,
      default: 0,
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

paymentSchema.index({ partyId: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
