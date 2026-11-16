const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.post('/register', protect, restrictTo('owner'), authController.register);
router.get('/users', protect, restrictTo('owner'), authController.getAllUsers);
router.patch('/users/:id', protect, restrictTo('owner'), authController.updateUserStatus);

module.exports = router;
