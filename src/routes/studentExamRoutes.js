const express = require('express');
const router = express.Router();
const studentExamController = require('../controllers/studentExamController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All student exam routes require student role
router.use(authenticate, authorize('student'));

router.get('/', studentExamController.getAvailableExams);
router.get('/:id', studentExamController.getExamDetails);
router.post('/:id/start', studentExamController.startExam);

module.exports = router;
