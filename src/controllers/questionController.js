const { Question } = require('../models');

// POST /api/questions
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, negativeMarks } = req.body;

    // Validate required fields
    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return res.status(400).json({ success: false, message: 'correctAnswer must be A, B, C, or D' });
    }

    const question = await Question.create({
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks: marks !== undefined ? marks : 1,
      negativeMarks: negativeMarks !== undefined ? negativeMarks : 0,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: 'Question created successfully', question });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/questions
exports.getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Question.findAndCountAll({
      where: { createdBy: req.user.id },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      questions: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/questions/:id
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, question });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// PUT /api/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const { questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, negativeMarks } = req.body;

    if (correctAnswer && !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return res.status(400).json({ success: false, message: 'correctAnswer must be A, B, C, or D' });
    }

    // Do not allow updating createdBy, it's strictly excluded here
    await question.update({
      questionText: questionText !== undefined ? questionText : question.questionText,
      optionA: optionA !== undefined ? optionA : question.optionA,
      optionB: optionB !== undefined ? optionB : question.optionB,
      optionC: optionC !== undefined ? optionC : question.optionC,
      optionD: optionD !== undefined ? optionD : question.optionD,
      correctAnswer: correctAnswer !== undefined ? correctAnswer : question.correctAnswer,
      marks: marks !== undefined ? marks : question.marks,
      negativeMarks: negativeMarks !== undefined ? negativeMarks : question.negativeMarks
    });

    res.json({ success: true, message: 'Question updated successfully', question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE /api/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await question.destroy();
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
