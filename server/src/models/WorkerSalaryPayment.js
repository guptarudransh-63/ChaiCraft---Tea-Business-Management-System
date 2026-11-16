const mongoose = require('mongoose');

const workerSalaryPaymentSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: [true, 'Worker is required'],
    },
    month: {
      type: String, // format YYYY-MM
      required: [true, 'Month (YYYY-MM) is required'],
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    advance: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingDue: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'cheque'],
      default: 'bank_transfer',
    },
    referenceNo: {
      type: String,
      default: '',
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

workerSalaryPaymentSchema.index({ worker: 1, month: 1 });

module.exports = mongoose.model('WorkerSalaryPayment', workerSalaryPaymentSchema);
