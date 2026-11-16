const mongoose = require('mongoose');

const productionBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Finished product is required'],
    },
    plannedQuantity: {
      type: Number,
      required: [true, 'Planned quantity is required'],
      min: [1, 'Planned quantity must be at least 1'],
    },
    producedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Produced quantity cannot be negative'],
    },
    productionDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    workers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
      },
    ],
    rawMaterialsConsumed: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        unit: {
          type: String,
          default: 'kg',
        },
      },
    ],
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    notes: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
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

productionBatchSchema.index({ status: 1 });
productionBatchSchema.index({ productionDate: -1 });

module.exports = mongoose.model('ProductionBatch', productionBatchSchema);
