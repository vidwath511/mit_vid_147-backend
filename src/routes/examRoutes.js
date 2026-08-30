const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All exam routes require admin role
router.use(authenticate, authorize('admin'));

router.post('/', examController.createExam);
router.get('/', examController.getExams);
router.get('/:id', examController.getExamById);
router.put('/:id', examController.updateExam);
router.delete('/:id', examController.deleteExam);

// Exam Questions
router.post('/:id/questions', examController.addQuestionsToExam);
router.get('/:id/questions', examController.getExamWithQuestions);
router.delete('/:id/questions/:questionId', examController.removeQuestionFromExam);

module.exports = router;
