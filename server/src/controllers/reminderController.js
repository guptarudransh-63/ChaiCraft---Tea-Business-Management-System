const Reminder = require('../models/Reminder');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getAllReminders = async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    const reminders = await Reminder.find(query).sort('dueDate');
    const now = new Date();

    // Dynamically update status based on current date
    const updatedReminders = reminders.map((r) => {
      const obj = r.toObject();
      if (obj.status !== 'resolved') {
        const diffDays = Math.ceil((new Date(obj.dueDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          obj.computedStatus = 'expired';
        } else if (diffDays <= obj.reminderDaysBefore) {
          obj.computedStatus = 'due_soon';
        } else {
          obj.computedStatus = 'upcoming';
        }
        obj.daysRemaining = diffDays;
      } else {
        obj.computedStatus = 'resolved';
      }
      return obj;
    });

    return successResponse(res, 200, 'Reminders retrieved', updatedReminders);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createReminder = async (req, res) => {
  try {
    const { title, category, dueDate, reminderDaysBefore = 30, notes, referenceId, referenceModel } = req.body;

    const reminder = await Reminder.create({
      title,
      category,
      dueDate,
      reminderDaysBefore,
      notes,
      referenceId,
      referenceModel,
      createdBy: req.user._id,
    });

    return successResponse(res, 201, 'Reminder created successfully', reminder);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return errorResponse(res, 404, 'Reminder not found');
    }

    Object.assign(reminder, req.body);
    await reminder.save();

    return successResponse(res, 200, 'Reminder updated', reminder);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    await Reminder.findByIdAndDelete(req.params.id);
    return successResponse(res, 200, 'Reminder deleted');
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
