const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { errorResponse } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication token required. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_tea_business_jwt_key_2026_production');

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return errorResponse(res, 401, 'The user belonging to this token no longer exists.');
    }

    if (!currentUser.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated. Contact owner.');
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid authentication token.');
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Authentication token has expired. Please log in again.');
    }
    return errorResponse(res, 500, 'Authentication error: ' + error.message);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role}' does not have permission to perform this action.`
      );
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
