const { ExamAttempt, ExamQuestion, Answer, Exam, Question, Result, sequelize } = require('../models');

// PUT /api/attempts/:attemptId/answers
exports.saveAnswer = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const studentId = req.user.id;
    const { questionId, selectedAnswer } = req.body;

    // 1. Validate input
    if (!questionId || !selectedAnswer) {
      return res.status(400).json({ success: false, message: 'questionId and selectedAnswer are required' });
    }

    if (!['A', 'B', 'C', 'D'].includes(selectedAnswer)) {
      return res.status(400).json({ success: false, message: 'Invalid selectedAnswer. Must be A, B, C, or D' });
    }

    // 2. Get the attempt and verify ownership
    const attempt = await ExamAttempt.findOne({
      where: { id: attemptId }
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, message: 'Forbidden. This attempt does not belong to you' });
    }

    // 3. Verify attempt status is in_progress
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot save answer. Attempt is not in progress' });
    }

    // 4. Verify that the question belongs to the exam associated with that attempt
    const examQuestion = await ExamQuestion.findOne({
      where: { examId: attempt.examId, questionId }
    });

    if (!examQuestion) {
      return res.status(400).json({ success: false, message: 'Question does not belong to this exam' });
    }

    // 5. Auto-save behavior: upsert-like logic
    let answer = await Answer.findOne({
      where: { attemptId, questionId }
    });

    if (!answer) {
      // Create new answer record
      answer = await Answer.create({
        attemptId: parseInt(attemptId, 10),
        questionId: parseInt(questionId, 10),
        selectedAnswer
      });
    } else {
      // Update existing answer record
      answer.selectedAnswer = selectedAnswer;
      await answer.save();
    }

    res.json({
      success: true,
      message: 'Answer saved successfully',
      answer: {
        id: answer.id,
        attemptId: answer.attemptId,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer
      }
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/attempts/:attemptId/submit
exports.submitExam = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const attemptId = req.params.attemptId;
    const studentId = req.user.id;

    // 1. Get the attempt and verify ownership & status
    const attempt = await ExamAttempt.findOne({
      where: { id: attemptId },
      transaction
    });

    if (!attempt) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.studentId !== studentId) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Forbidden. This attempt does not belong to you' });
    }

    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Attempt has already been submitted' });
    }

    if (attempt.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot submit. Attempt is not in progress' });
    }

    // 2. Get the Exam associated with the attempt
    const exam = await Exam.findOne({
      where: { id: attempt.examId },
      include: [{
        model: Question,
        through: { attributes: [] }
      }],
      transaction
    });

    if (!exam) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // 3. Get all saved Answer records belonging to that attempt
    const answers = await Answer.findAll({
      where: { attemptId },
      transaction
    });

    const answerMap = {};
    answers.forEach(a => {
      answerMap[a.questionId] = a.selectedAnswer;
    });

    // 4. Calculate score
    let score = 0;
    let correctAnswersCount = 0;
    let wrongAnswersCount = 0;
    let unansweredQuestionsCount = 0;

    exam.Questions.forEach(question => {
      const studentAnswer = answerMap[question.id];

      if (!studentAnswer) {
        unansweredQuestionsCount += 1;
      } else if (studentAnswer === question.correctAnswer) {
        score += question.marks;
        correctAnswersCount += 1;
      } else {
        if (question.negativeMarks > 0) {
          score -= question.negativeMarks;
        }
        wrongAnswersCount += 1;
      }
    });

    // 5. Calculate percentage and passed
    const percentage = exam.totalMarks > 0 ? (score / exam.totalMarks) * 100 : 0;
    const passed = score >= exam.passingMarks;

    // 6. Create Result record
    const result = await Result.create({
      attemptId: attempt.id,
      studentId: studentId,
      examId: exam.id,
      score,
      correctAnswers: correctAnswersCount,
      wrongAnswers: wrongAnswersCount,
      unansweredQuestions: unansweredQuestionsCount,
      percentage,
      passed
    }, { transaction });

    // 7. Update ExamAttempt
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    await attempt.save({ transaction });

    // Commit transaction
    await transaction.commit();

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      result: {
        attemptId: result.attemptId,
        score: result.score,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        unansweredQuestions: result.unansweredQuestions,
        percentage: result.percentage,
        passed: result.passed
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting exam:', error);
    res.status(500).json({ success: false, message: 'Server error during submission' });
  }
};

