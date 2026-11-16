const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/dues', reportController.getDuesReport);

module.exports = router;
