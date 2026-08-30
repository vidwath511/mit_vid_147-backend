const { Exam, Question, ExamAttempt, Answer } = require('../models');

// Helper function to shuffle an array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/student/exams
exports.getAvailableExams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Exam.findAndCountAll({
      where: { status: 'published' },
      attributes: ['id', 'title', 'description', 'duration', 'totalMarks', 'passingMarks', 'status'],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      exams: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting available exams:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/exams/:id
exports.getExamDetails = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, status: 'published' },
      attributes: ['id', 'title', 'description', 'duration', 'totalMarks', 'passingMarks', 'status']
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found or unavailable' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error getting exam details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/student/exams/:id/start
exports.startExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.id;

    // 1. Verify the exam exists and is available
    const exam = await Exam.findOne({
      where: { id: examId, status: 'published' },
      attributes: ['id', 'title', 'duration'],
      include: [{
        model: Question,
        attributes: ['id', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'marks', 'negativeMarks'],
        through: { attributes: ['questionOrder'] }
      }]
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found or unavailable' });
    }

    // 2. Check for an existing attempt
    let attempt = await ExamAttempt.findOne({
      where: { examId, studentId }
    });

    if (attempt) {
      if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
        return res.status(403).json({ success: false, message: 'You have already completed this exam' });
      }
      
      const existingAnswers = await Answer.findAll({
        where: { attemptId: attempt.id },
        attributes: ['questionId', 'selectedAnswer']
      });

      let orderedQuestions = exam.Questions;
      if (attempt.questionOrder && Array.isArray(attempt.questionOrder)) {
        const orderMap = {};
        attempt.questionOrder.forEach((id, index) => {
          orderMap[id] = index;
        });
        orderedQuestions.sort((a, b) => {
          const indexA = orderMap[a.id] !== undefined ? orderMap[a.id] : 99999;
          const indexB = orderMap[b.id] !== undefined ? orderMap[b.id] : 99999;
          return indexA - indexB;
        });
      }

      // If it's already in_progress, we just return the safe start data again
      return res.json({
        success: true,
        message: 'Exam resumed successfully',
        attemptInfo: {
          attemptId: attempt.id,
          examId: exam.id,
          title: exam.title,
          duration: exam.duration,
          startedAt: attempt.startedAt,
          status: attempt.status
        },
        questions: orderedQuestions,
        answers: existingAnswers
      });
    }

    // 3. Create a new attempt
    const shuffledQuestions = shuffleArray(exam.Questions);
    const questionOrder = shuffledQuestions.map(q => q.id);

    attempt = await ExamAttempt.create({
      examId: parseInt(examId, 10),
      studentId: parseInt(studentId, 10),
      status: 'in_progress',
      startedAt: new Date(),
      questionOrder: questionOrder
    });

    res.status(201).json({
      success: true,
      message: 'Exam started successfully',
      attemptInfo: {
        attemptId: attempt.id,
        examId: exam.id,
        title: exam.title,
        duration: exam.duration,
        startedAt: attempt.startedAt,
        status: attempt.status
      },
      questions: shuffledQuestions
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
