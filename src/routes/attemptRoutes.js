const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Route requires student role
router.use(authenticate, authorize('student'));

router.put('/:attemptId/answers', attemptController.saveAnswer);
router.post('/:attemptId/submit', attemptController.submitExam);

module.exports = router;
