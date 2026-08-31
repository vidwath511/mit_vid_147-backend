const { User, Result, Exam, ExamAttempt, Answer, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = { role: 'student' };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'createdAt'],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      students: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await User.findOne({
      where: { id: studentId, role: 'student' },
      attributes: ['id', 'name', 'email', 'createdAt']
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error('Error getting student details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStudentResults = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const adminId = req.user.id;
    
    // We only want results for exams created by this admin
    const results = await Result.findAll({
      where: { studentId },
      include: [
        { model: Exam, where: { createdBy: adminId }, attributes: ['id', 'title'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedResults = results.map(r => ({
      id: r.id,
      attemptId: r.attemptId,
      examId: r.Exam ? r.Exam.id : null,
      examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      submittedAt: r.ExamAttempt ? r.ExamAttempt.submittedAt : r.createdAt
    }));

    res.json({
      success: true,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error getting student results:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const studentId = req.params.studentId;

    const student = await User.findOne({
      where: { id: studentId, role: 'student' }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Student not found or is not a student account.' });
    }

    // Find all attempts by this student
    const attempts = await ExamAttempt.findAll({
      where: { studentId },
      attributes: ['id'],
      transaction
    });

    const attemptIds = attempts.map(a => a.id);

    if (attemptIds.length > 0) {
      // 1. Delete answers associated with these attempts
      await Answer.destroy({
        where: { attemptId: { [Op.in]: attemptIds } },
        transaction
      });

      // 2. Delete results associated with these attempts or this student
      await Result.destroy({
        where: {
          [Op.or]: [
            { attemptId: { [Op.in]: attemptIds } },
            { studentId }
          ]
        },
        transaction
      });

      // 3. Delete attempts
      await ExamAttempt.destroy({
        where: { id: { [Op.in]: attemptIds } },
        transaction
      });
    } else {
      // Delete any direct results
      await Result.destroy({
        where: { studentId },
        transaction
      });
    }

    // 4. Delete the student User record
    await User.destroy({
      where: { id: studentId },
      transaction
    });

    await transaction.commit();

    res.json({
      success: true,
      message: `Student '${student.name}' deleted successfully.`
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Server error deleting student.' });
  }
};
