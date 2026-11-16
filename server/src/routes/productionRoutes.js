const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', productionController.getAllBatches);
router.get('/:id', productionController.getBatchById);
router.post('/', restrictTo('owner', 'manager'), productionController.createBatch);
router.patch('/:id/status', restrictTo('owner', 'manager'), productionController.updateBatchStatus);

module.exports = router;
