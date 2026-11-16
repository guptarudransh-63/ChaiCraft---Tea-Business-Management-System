const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', restrictTo('owner', 'manager', 'sales'), orderController.getAllOrders);
router.post('/', restrictTo('owner', 'manager', 'sales'), orderController.createOrder);
router.get('/:id', restrictTo('owner', 'manager', 'sales'), orderController.getOrderById);
router.patch('/:id/status', restrictTo('owner', 'manager'), orderController.updateOrderStatus);

module.exports = router;
