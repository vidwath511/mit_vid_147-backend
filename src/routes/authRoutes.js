const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected route for testing
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, message: 'Protected route accessed', user: req.user });
});

router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Admin route accessed', user: req.user });
});

router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.updatePassword);

module.exports = router;
