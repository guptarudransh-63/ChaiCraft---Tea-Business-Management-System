const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort('-createdAt').limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    return successResponse(res, 200, 'Notifications retrieved', {
      notifications,
      unreadCount,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    return successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
