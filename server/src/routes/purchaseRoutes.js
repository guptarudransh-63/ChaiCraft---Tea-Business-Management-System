const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/', purchaseController.getAllPurchases);
router.post('/', purchaseController.createPurchase);
router.get('/:id', purchaseController.getPurchaseById);
router.patch('/:id/status', purchaseController.updatePurchaseStatus);

module.exports = router;
