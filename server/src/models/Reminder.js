const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'product_expiry',
        'raw_material_expiry',
        'license',
        'business_document',
        'supplier_contract',
        'dealer_agreement',
        'equipment_maintenance',
        'insurance',
        'tax_filing',
        'custom',
      ],
      default: 'custom',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    reminderDaysBefore: {
      type: Number,
      default: 30,
      min: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'due_soon', 'expired', 'resolved'],
      default: 'upcoming',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceModel: {
      type: String,
      default: null,
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

reminderSchema.index({ dueDate: 1 });
reminderSchema.index({ status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
