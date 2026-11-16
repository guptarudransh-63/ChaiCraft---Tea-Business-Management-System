const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: [true, 'Worker reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'leave'],
      required: [true, 'Attendance status is required'],
      default: 'present',
    },
    checkInTime: {
      type: String,
      default: '09:00 AM',
    },
    checkOutTime: {
      type: String,
      default: '06:00 PM',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: each worker can only have 1 attendance record per day
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
