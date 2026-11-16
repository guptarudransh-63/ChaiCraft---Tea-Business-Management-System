const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/daily', restrictTo('owner', 'manager'), attendanceController.getDailyAttendance);
router.post('/daily', restrictTo('owner', 'manager'), attendanceController.markDailyAttendance);
router.get('/monthly', restrictTo('owner', 'manager'), attendanceController.getMonthlyReport);
router.get('/my', attendanceController.getMyAttendance);

module.exports = router;
