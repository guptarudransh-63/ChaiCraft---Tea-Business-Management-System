const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/', expenseController.getAllExpenses);
router.get('/summary', expenseController.getExpenseSummary);
router.post('/', expenseController.createExpense);
router.delete('/:id', restrictTo('owner'), expenseController.deleteExpense);

module.exports = router;
