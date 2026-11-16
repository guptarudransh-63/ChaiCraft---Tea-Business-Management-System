const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager', 'sales'));

router.get('/', paymentController.getAllPayments);
router.post('/', paymentController.recordPayment);

module.exports = router;
