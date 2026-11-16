const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner', 'manager'));

router.get('/', supplierController.getAllSuppliers);
router.post('/', supplierController.createSupplier);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.get('/:id/ledger', supplierController.getSupplierLedger);

module.exports = router;
