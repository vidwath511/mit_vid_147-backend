const express = require('express');
const router = express.Router();
const studentDashboardController = require('../controllers/studentDashboardController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require student role
router.use(authenticate, authorize('student'));

router.get('/results', studentDashboardController.getResults);
router.get('/results/:attemptId', studentDashboardController.getSingleResult);
router.get('/results/:attemptId/pdf', studentDashboardController.generatePdfScorecard);
router.get('/dashboard', studentDashboardController.getDashboard);

module.exports = router;
