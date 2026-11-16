const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Helper to normalize date to midnight UTC/Local
const normalizeDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.getDailyAttendance = async (req, res) => {
  try {
    const targetDate = normalizeDate(req.query.date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const workers = await Worker.find({ employmentStatus: 'active' }).sort('name');
    const attendanceRecords = await Attendance.find({
      date: { $gte: targetDate, $lt: nextDay },
    });

    const attendanceMap = {};
    attendanceRecords.forEach((rec) => {
      attendanceMap[rec.worker.toString()] = rec;
    });

    const roster = workers.map((worker) => {
      const record = attendanceMap[worker._id.toString()];
      return {
        worker: {
          _id: worker._id,
          name: worker.name,
          phone: worker.phone,
          role: worker.role,
          department: worker.department,
        },
        status: record ? record.status : 'not_marked',
        checkInTime: record ? record.checkInTime : '',
        checkOutTime: record ? record.checkOutTime : '',
        notes: record ? record.notes : '',
        recordId: record ? record._id : null,
      };
    });

    const counts = {
      total: workers.length,
      present: roster.filter((r) => r.status === 'present').length,
      absent: roster.filter((r) => r.status === 'absent').length,
      half_day: roster.filter((r) => r.status === 'half_day').length,
      leave: roster.filter((r) => r.status === 'leave').length,
      not_marked: roster.filter((r) => r.status === 'not_marked').length,
    };

    return successResponse(res, 200, 'Daily attendance roster retrieved', {
      date: targetDate,
      counts,
      roster,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.markDailyAttendance = async (req, res) => {
  try {
    const { date, entries } = req.body;
    // entries: array of { workerId, status, checkInTime, checkOutTime, notes }
    if (!entries || !Array.isArray(entries)) {
      return errorResponse(res, 400, 'Entries must be an array of attendance records');
    }

    const targetDate = normalizeDate(date);
    const operations = entries.map((entry) => ({
      updateOne: {
        filter: { worker: entry.workerId, date: targetDate },
        update: {
          $set: {
            worker: entry.workerId,
            date: targetDate,
            status: entry.status,
            checkInTime: ['absent', 'leave'].includes(entry.status) ? '' : (entry.checkInTime || '09:00 AM'),
            checkOutTime: ['absent', 'leave'].includes(entry.status) ? '' : (entry.checkOutTime || '06:00 PM'),
            notes: entry.notes || '',
            markedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    return successResponse(res, 200, 'Attendance saved successfully');
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query; // e.g. 2026, 10
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const workers = await Worker.find({ employmentStatus: 'active' });
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const report = workers.map((worker) => {
      const workerRecords = records.filter(
        (r) => r.worker.toString() === worker._id.toString()
      );
      const present = workerRecords.filter((r) => r.status === 'present').length;
      const halfDay = workerRecords.filter((r) => r.status === 'half_day').length;
      const absent = workerRecords.filter((r) => r.status === 'absent').length;
      const leave = workerRecords.filter((r) => r.status === 'leave').length;
      const totalMarkedDays = workerRecords.length;

      const effectivePresent = present + halfDay * 0.5;
      const percentage = totalMarkedDays > 0 ? ((effectivePresent / totalMarkedDays) * 100).toFixed(1) : 0;

      return {
        worker: {
          _id: worker._id,
          name: worker.name,
          role: worker.role,
          department: worker.department,
        },
        present,
        halfDay,
        absent,
        leave,
        totalMarkedDays,
        attendancePercentage: Number(percentage),
      };
    });

    return successResponse(res, 200, 'Monthly attendance report generated', {
      month: currentMonth + 1,
      year: currentYear,
      report,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    if (!req.user.workerRef) {
      return errorResponse(res, 400, 'No linked worker profile found for this user account');
    }

    const records = await Attendance.find({ worker: req.user.workerRef })
      .sort('-date')
      .limit(60);

    return successResponse(res, 200, 'Your attendance records', records);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
