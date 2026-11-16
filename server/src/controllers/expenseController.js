const Expense = require('../models/Expense');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { logAudit } = require('../utils/auditLogger');

exports.getAllExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('createdBy', 'name role')
      .sort('-date')
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Expenses retrieved', expenses, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { category, amount, date, description, paymentMethod, vendor, receiptAttachment } = req.body;

    const expense = await Expense.create({
      category,
      amount: Number(amount),
      date: date || new Date(),
      description,
      paymentMethod: paymentMethod || 'bank_transfer',
      vendor,
      receiptAttachment,
      createdBy: req.user._id,
    });

    await logAudit({
      action: 'EXPENSE_RECORDED',
      entity: 'Expense',
      entityId: expense._id,
      user: req.user,
      newState: expense.toObject(),
      details: `Logged expense of ₹${amount} for ${category}`,
      req,
    });

    return successResponse(res, 201, 'Expense recorded successfully', expense);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return errorResponse(res, 404, 'Expense not found');
    }

    await Expense.findByIdAndDelete(req.params.id);

    await logAudit({
      action: 'EXPENSE_DELETED',
      entity: 'Expense',
      entityId: expense._id,
      user: req.user,
      previousState: expense.toObject(),
      details: `Deleted expense of ₹${expense.amount} (${expense.description})`,
      req,
    });

    return successResponse(res, 200, 'Expense deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const expenses = await Expense.find();

    const categoryBreakdown = {};
    let totalExpense = 0;

    expenses.forEach((e) => {
      totalExpense += e.amount;
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    return successResponse(res, 200, 'Expense summary calculated', {
      totalExpense,
      categoryBreakdown,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
