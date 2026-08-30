const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/results', adminDashboardController.getResults);
router.get('/results/export', adminDashboardController.exportResults);
router.get('/results/:attemptId', adminDashboardController.getSingleResult);
router.get('/dashboard', adminDashboardController.getDashboard);
router.get('/exams/:examId/analytics', adminDashboardController.getExamAnalytics);

module.exports = router;
