const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', productController.getAllProducts);
router.get('/low-stock', restrictTo('owner', 'manager'), productController.getLowStockProducts);
router.get('/valuation', restrictTo('owner', 'manager'), productController.getInventoryValuation);
router.get('/transactions', restrictTo('owner', 'manager'), productController.getTransactions);
router.get('/:id', productController.getProductById);

router.post('/', restrictTo('owner', 'manager'), productController.createProduct);
router.put('/:id', restrictTo('owner', 'manager'), productController.updateProduct);
router.post('/:id/adjust', restrictTo('owner', 'manager'), productController.adjustStock);

module.exports = router;
