const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/', reminderController.getAllReminders);
router.post('/', reminderController.createReminder);
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', restrictTo('owner'), reminderController.deleteReminder);

module.exports = router;
