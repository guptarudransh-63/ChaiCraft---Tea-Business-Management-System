const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  action,
  entity,
  entityId,
  user,
  previousState = null,
  newState = null,
  details = '',
  req = null,
}) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    await AuditLog.create({
      action,
      entity,
      entityId,
      performedBy: {
        userId: user?._id || user?.id,
        name: user?.name || 'System',
        role: user?.role || 'system',
      },
      previousState,
      newState,
      details,
      ipAddress,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
};

module.exports = { logAudit };
