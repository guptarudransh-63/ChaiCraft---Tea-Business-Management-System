const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', restrictTo('owner', 'manager'), workerController.getAllWorkers);
router.post('/', restrictTo('owner', 'manager'), workerController.createWorker);
router.get('/:id', workerController.getWorkerById);
router.put('/:id', restrictTo('owner', 'manager'), workerController.updateWorker);
router.post('/salary-payment', restrictTo('owner'), workerController.recordSalaryPayment);

module.exports = router;
