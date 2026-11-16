const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/overview', dashboardController.getDashboardData);

module.exports = router;
