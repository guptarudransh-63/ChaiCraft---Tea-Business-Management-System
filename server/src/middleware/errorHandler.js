const { errorResponse } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle Mongoose Bad ObjectId CastError
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return errorResponse(res, 404, message);
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value for field '${field}': '${value}'. Please use another value.`;
    return errorResponse(res, 400, message);
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    return errorResponse(res, 400, 'Invalid input data', errors);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid authentication token');
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token has expired');
  }

  console.error('SERVER ERROR 💥:', err);

  return errorResponse(
    res,
    err.statusCode,
    err.message || 'Internal server error occurred'
  );
};

module.exports = errorHandler;
