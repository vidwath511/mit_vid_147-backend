const express = require('express');
const router = express.Router();
const adminStudentController = require('../controllers/adminStudentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate, authorize('admin'));

router.get('/', adminStudentController.getAllStudents);
router.get('/:studentId', adminStudentController.getStudentDetails);
router.get('/:studentId/results', adminStudentController.getStudentResults);

module.exports = router;
