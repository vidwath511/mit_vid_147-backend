const { Exam, Question, ExamQuestion } = require('../models');

// POST /api/exams
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, totalMarks, passingMarks, status } = req.body;

    if (!title || duration === undefined || totalMarks === undefined || passingMarks === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const exam = await Exam.create({
      title,
      description,
      duration,
      totalMarks,
      passingMarks,
      status: status || 'draft',
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: 'Exam created successfully', exam });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exams
exports.getExams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Exam.findAndCountAll({
      where: { createdBy: req.user.id },
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
    console.error('Error getting exams:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exams/:id
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error getting exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/exams/:id
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const { title, description, duration, totalMarks, passingMarks, status } = req.body;

    await exam.update({
      title: title !== undefined ? title : exam.title,
      description: description !== undefined ? description : exam.description,
      duration: duration !== undefined ? duration : exam.duration,
      totalMarks: totalMarks !== undefined ? totalMarks : exam.totalMarks,
      passingMarks: passingMarks !== undefined ? passingMarks : exam.passingMarks,
      status: status !== undefined ? status : exam.status
    });

    res.json({ success: true, message: 'Exam updated successfully', exam });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/exams/:id
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    await exam.destroy();
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/exams/:id/questions
exports.addQuestionsToExam = async (req, res) => {
  try {
    const examId = req.params.id;
    let { questionIds } = req.body;

    // Convert single id to array if needed
    if (!Array.isArray(questionIds)) {
      if (!questionIds) {
        return res.status(400).json({ success: false, message: 'questionIds is required' });
      }
      questionIds = [questionIds];
    }

    // 1. Verify the exam belongs to the admin
    const exam = await Exam.findOne({
      where: { id: examId, createdBy: req.user.id }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // 2. Verify all questions belong to the admin
    const questions = await Question.findAll({
      where: { id: questionIds, createdBy: req.user.id }
    });

    if (questions.length !== questionIds.length) {
      return res.status(403).json({ success: false, message: 'One or more questions are invalid or do not belong to you' });
    }

    // 3. Find existing relationships to prevent duplicates
    const existingLinks = await ExamQuestion.findAll({
      where: { examId, questionId: questionIds }
    });
    const existingQuestionIds = existingLinks.map(link => link.questionId);

    const newQuestionIds = questionIds.filter(id => !existingQuestionIds.includes(id));

    if (newQuestionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'All specified questions are already added to this exam' });
    }

    // 4. Create the new links
    const newLinks = newQuestionIds.map((qId, index) => ({
      examId: parseInt(examId, 10),
      questionId: parseInt(qId, 10),
      questionOrder: existingLinks.length + index + 1 // basic ordering
    }));

    await ExamQuestion.bulkCreate(newLinks);

    res.json({ success: true, message: 'Questions added to exam successfully', addedCount: newQuestionIds.length });
  } catch (error) {
    console.error('Error adding questions to exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/exams/:id/questions
exports.getExamWithQuestions = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, createdBy: req.user.id },
      include: [{
        model: Question,
        through: { attributes: ['questionOrder'] } // include the junction table data
      }]
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error getting exam questions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/exams/:id/questions/:questionId
exports.removeQuestionFromExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const questionId = req.params.questionId;

    // 1. Verify the exam belongs to the admin
    const exam = await Exam.findOne({
      where: { id: examId, createdBy: req.user.id }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // 2. Remove the relationship
    const deletedCount = await ExamQuestion.destroy({
      where: { examId, questionId }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Question is not part of this exam' });
    }

    res.json({ success: true, message: 'Question removed from exam successfully' });
  } catch (error) {
    console.error('Error removing question from exam:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
