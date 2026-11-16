const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
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
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      required: [true, 'Worker role/designation is required'],
      trim: true,
      default: 'Packaging Operator',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['Packaging', 'Blending', 'Warehouse', 'Quality Control', 'Maintenance', 'General'],
      default: 'Packaging',
    },
    salary: {
      type: Number,
      required: [true, 'Monthly salary is required'],
      min: [0, 'Salary cannot be negative'],
      default: 15000,
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'on_leave', 'terminated'],
      default: 'active',
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workerSchema.index({ phone: 1 });
workerSchema.index({ employmentStatus: 1 });
workerSchema.index({ department: 1 });

module.exports = mongoose.model('Worker', workerSchema);
