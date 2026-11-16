const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', restrictTo('owner', 'manager', 'sales'), customerController.getAllCustomers);
router.post('/', restrictTo('owner', 'manager', 'sales'), customerController.createCustomer);
router.get('/:id', restrictTo('owner', 'manager', 'sales'), customerController.getCustomerById);
router.put('/:id', restrictTo('owner', 'manager', 'sales'), customerController.updateCustomer);
router.get('/:id/ledger', restrictTo('owner', 'manager', 'sales'), customerController.getCustomerLedger);

module.exports = router;
