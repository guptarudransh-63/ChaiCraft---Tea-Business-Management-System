const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getAllAuditLogs = async (req, res) => {
  try {
    const { entity, action, page = 1, limit = 50 } = req.query;
    const query = {};

    if (entity) query.entity = entity;
    if (action) query.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Audit logs retrieved', logs, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
