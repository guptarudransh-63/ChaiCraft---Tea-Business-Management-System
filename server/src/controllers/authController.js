const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_tea_business_jwt_key_2026_production', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, workerRef } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'worker',
      phone,
      workerRef,
    });

    user.password = undefined;

    await logAudit({
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user._id,
      user: req.user || { name: 'Self Registration', role: user.role },
      newState: { name: user.name, email: user.email, role: user.role },
      req,
    });

    const token = signToken(user._id);

    return successResponse(res, 201, 'User registered successfully', {
      user,
      token,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide both email and password');
    }

    const user = await User.findOne({ email }).select('+password').populate('workerRef');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account is deactivated. Contact administrator.');
    }

    const token = signToken(user._id);
    user.password = undefined;

    await logAudit({
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id,
      user,
      details: `User logged in from ${req.ip || 'web'}`,
      req,
    });

    return successResponse(res, 200, 'Logged in successfully', {
      user,
      token,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('workerRef');
    return successResponse(res, 200, 'Current user retrieved', { user });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('workerRef').sort('-createdAt');
    return successResponse(res, 200, 'Users retrieved', { users });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const previousState = { isActive: user.isActive, role: user.role };

    if (isActive !== undefined) user.isActive = isActive;
    if (role !== undefined) user.role = role;

    await user.save();

    await logAudit({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user._id,
      user: req.user,
      previousState,
      newState: { isActive: user.isActive, role: user.role },
      req,
    });

    return successResponse(res, 200, 'User updated successfully', { user });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
