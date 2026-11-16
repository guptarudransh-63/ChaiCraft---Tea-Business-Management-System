const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('owner'));

router.get('/', auditLogController.getAllAuditLogs);

module.exports = router;
