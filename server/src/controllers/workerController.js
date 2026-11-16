const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const WorkerSalaryPayment = require('../models/WorkerSalaryPayment');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

exports.getAllWorkers = async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const query = {};

    if (status) query.employmentStatus = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const workers = await Worker.find(query).sort('name');

    // If role is worker, hide other workers' sensitive salary data if needed
    const isOwnerOrManager = ['owner', 'manager'].includes(req.user.role);
    const sanitizedWorkers = workers.map((w) => {
      const obj = w.toObject();
      if (!isOwnerOrManager && req.user.role !== 'owner') {
        delete obj.salary;
      }
      return obj;
    });

    return successResponse(res, 200, 'Workers retrieved', sanitizedWorkers);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return errorResponse(res, 404, 'Worker not found');
    }

    // Role check: Worker can only view their own record
    if (req.user.role === 'worker' && (!req.user.workerRef || req.user.workerRef.toString() !== worker._id.toString())) {
      return errorResponse(res, 403, 'You can only view your own profile');
    }

    // Fetch recent 30-day attendance
    const recentAttendance = await Attendance.find({ worker: worker._id })
      .sort('-date')
      .limit(30);

    // Fetch salary payments (Owner only)
    let salaryHistory = [];
    if (req.user.role === 'owner') {
      salaryHistory = await WorkerSalaryPayment.find({ worker: worker._id }).sort('-paymentDate');
    }

    const workerObj = worker.toObject();
    if (req.user.role !== 'owner') {
      delete workerObj.salary;
    }

    return successResponse(res, 200, 'Worker details retrieved', {
      worker: workerObj,
      recentAttendance,
      salaryHistory,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createWorker = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      joiningDate,
      role,
      department,
      salary,
      emergencyContact,
      notes,
    } = req.body;

    const worker = await Worker.create({
      name,
      phone,
      email,
      address,
      joiningDate: joiningDate || Date.now(),
      role,
      department,
      salary,
      emergencyContact,
      notes,
    });

    await logAudit({
      action: 'WORKER_HIRED',
      entity: 'Worker',
      entityId: worker._id,
      user: req.user,
      newState: worker.toObject(),
      req,
    });

    return successResponse(res, 201, 'Worker added successfully', worker);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return errorResponse(res, 404, 'Worker not found');
    }

    const previousState = worker.toObject();

    // Only owner can update salary
    if (req.body.salary !== undefined && req.user.role !== 'owner') {
      return errorResponse(res, 403, 'Only business owner can change worker salary');
    }

    Object.assign(worker, req.body);
    await worker.save();

    await logAudit({
      action: 'WORKER_UPDATED',
      entity: 'Worker',
      entityId: worker._id,
      user: req.user,
      previousState,
      newState: worker.toObject(),
      req,
    });

    return successResponse(res, 200, 'Worker updated successfully', worker);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.recordSalaryPayment = async (req, res) => {
  try {
    const { workerId, month, baseSalary, advance = 0, deductions = 0, paidAmount, paymentMethod, referenceNo, notes } = req.body;

    if (!workerId || paidAmount === undefined || isNaN(paidAmount)) {
      return errorResponse(res, 400, 'workerId and valid numeric paidAmount are required');
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return errorResponse(res, 404, 'Worker not found');
    }

    const remainingDue = (baseSalary || worker.salary) - advance - deductions - paidAmount;

    const payment = await WorkerSalaryPayment.create({
      worker: workerId,
      month,
      baseSalary: baseSalary || worker.salary,
      advance,
      deductions,
      paidAmount,
      remainingDue: Math.max(0, remainingDue),
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'bank_transfer',
      referenceNo,
      notes,
      createdBy: req.user._id,
    });

    await logAudit({
      action: 'WORKER_SALARY_PAID',
      entity: 'WorkerSalaryPayment',
      entityId: payment._id,
      user: req.user,
      newState: payment.toObject(),
      details: `Paid ${paidAmount} to worker ${worker.name} for month ${month}`,
      req,
    });

    return successResponse(res, 201, 'Salary payment recorded', payment);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
