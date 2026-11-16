const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'transport',
        'electricity',
        'rent',
        'salaries',
        'packaging',
        'raw_materials',
        'maintenance',
        'fuel',
        'delivery',
        'marketing',
        'miscellaneous',
      ],
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      default: 'bank_transfer',
    },
    vendor: {
      type: String,
      trim: true,
      default: '',
    },
    receiptAttachment: {
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

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
