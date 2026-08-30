const { User, Result, Exam, ExamAttempt } = require('../models');

exports.getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const { Op } = require('sequelize');
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
