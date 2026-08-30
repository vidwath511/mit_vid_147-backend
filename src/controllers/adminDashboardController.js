const { Result, ExamAttempt, Exam, Question, User } = require('../models');
const ExcelJS = require('exceljs');

// GET /api/admin/results
exports.getResults = async (req, res) => {
  try {
    const adminId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const filterExamId = req.query.examId;

    const examWhere = { createdBy: adminId };
    if (filterExamId) {
      examWhere.id = filterExamId;
    }

    const { count, rows } = await Result.findAndCountAll({
      include: [
        { model: Exam, where: examWhere, attributes: ['id', 'title'] },
        { model: User, attributes: ['id', 'name'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const results = rows.map(r => ({
      id: r.id,
      attemptId: r.attemptId,
      studentId: r.User ? r.User.id : null,
      studentName: r.User ? r.User.name : 'Unknown Student',
      examId: r.Exam ? r.Exam.id : null,
      examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
      score: r.score,
      percentage: r.percentage,
      correctAnswers: r.correctAnswers,
      wrongAnswers: r.wrongAnswers,
      passed: r.passed,
      submittedAt: r.ExamAttempt ? r.ExamAttempt.submittedAt : r.createdAt
    }));

    res.json({
      success: true,
      results,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting admin results:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/results/:attemptId
exports.getSingleResult = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const adminId = req.user.id;

    const result = await Result.findOne({
      where: { attemptId },
      include: [
        { model: Exam, where: { createdBy: adminId }, attributes: ['id', 'title'] },
        { model: User, attributes: ['id', 'name'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ]
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found or forbidden' });
    }

    res.json({
      success: true,
      result: {
        id: result.id,
        attemptId: result.attemptId,
        studentId: result.User ? result.User.id : null,
        studentName: result.User ? result.User.name : 'Unknown Student',
        examId: result.Exam ? result.Exam.id : null,
        examTitle: result.Exam ? result.Exam.title : 'Unknown Exam',
        score: result.score,
        percentage: result.percentage,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        passed: result.passed,
        submittedAt: result.ExamAttempt ? result.ExamAttempt.submittedAt : result.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting single admin result:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const adminId = req.user.id;

    // 1. Get Exams metrics
    const exams = await Exam.findAll({ where: { createdBy: adminId } });
    const totalExams = exams.length;
    const publishedExams = exams.filter(e => e.status === 'published').length;

    // 2. Get Questions metrics
    const totalQuestions = await Question.count({ where: { createdBy: adminId } });

    // 3. Get Results metrics
    const allResults = await Result.findAll({
      include: [
        { model: Exam, where: { createdBy: adminId }, attributes: ['id', 'title'] },
        { model: User, attributes: ['id', 'name'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalAttempts = allResults.length;
    const uniqueStudents = new Set();
    let totalPassed = 0;
    let totalFailed = 0;
    let sumPercentage = 0;

    allResults.forEach(r => {
      uniqueStudents.add(r.studentId);
      if (r.passed) totalPassed++;
      else totalFailed++;
      sumPercentage += r.percentage;
    });

    const totalStudentsAttempted = uniqueStudents.size;
    const averageScorePercentage = totalAttempts > 0 ? (sumPercentage / totalAttempts) : 0;

    // 4. Recent Results (Top 5)
    const recentResults = allResults.slice(0, 5).map(r => ({
      attemptId: r.attemptId,
      studentId: r.User ? r.User.id : null,
      studentName: r.User ? r.User.name : 'Unknown Student',
      examId: r.Exam ? r.Exam.id : null,
      examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      submittedAt: r.ExamAttempt ? r.ExamAttempt.submittedAt : r.createdAt
    }));

    res.json({
      success: true,
      dashboard: {
        totalExams,
        publishedExams,
        totalQuestions,
        totalAttempts,
        totalStudentsAttempted,
        averageScorePercentage: parseFloat(averageScorePercentage.toFixed(2)),
        totalPassed,
        totalFailed,
        recentResults
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/exams/:examId/analytics
exports.getExamAnalytics = async (req, res) => {
  try {
    const adminId = req.user.id;
    const examId = req.params.examId;

    const exam = await Exam.findOne({ where: { id: examId, createdBy: adminId } });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found or forbidden' });
    }

    const results = await Result.findAll({ where: { examId } });

    const totalAttempts = results.length;
    let totalPassed = 0;
    let totalFailed = 0;
    let sumPercentage = 0;
    let highestScorePercentage = 0;
    let lowestScorePercentage = 100;

    results.forEach(r => {
      if (r.passed) totalPassed++;
      else totalFailed++;
      sumPercentage += r.percentage;
      if (r.percentage > highestScorePercentage) highestScorePercentage = r.percentage;
      if (r.percentage < lowestScorePercentage) lowestScorePercentage = r.percentage;
    });

    if (totalAttempts === 0) {
      lowestScorePercentage = 0; // reset default if no results
    }

    const averageScorePercentage = totalAttempts > 0 ? (sumPercentage / totalAttempts) : 0;

    res.json({
      success: true,
      analytics: {
        examId: exam.id,
        examTitle: exam.title,
        totalAttempts,
        totalPassed,
        totalFailed,
        averageScorePercentage: parseFloat(averageScorePercentage.toFixed(2)),
        highestScorePercentage: parseFloat(highestScorePercentage.toFixed(2)),
        lowestScorePercentage: parseFloat(lowestScorePercentage.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error getting exam analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/results/export
exports.exportResults = async (req, res) => {
  try {
    const adminId = req.user.id;
    const filterExamId = req.query.examId;

    const examWhere = { createdBy: adminId };
    if (filterExamId) {
      examWhere.id = filterExamId;
    }

    const results = await Result.findAll({
      include: [
        { model: Exam, where: examWhere, attributes: ['id', 'title', 'totalMarks'] },
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    worksheet.columns = [
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Student Email', key: 'studentEmail', width: 30 },
      { header: 'Exam Title', key: 'examTitle', width: 30 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Marks', key: 'totalMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 },
      { header: 'Status', key: 'passed', width: 15 },
      { header: 'Correct Answers', key: 'correctAnswers', width: 15 },
      { header: 'Wrong Answers', key: 'wrongAnswers', width: 15 },
      { header: 'Date Submitted', key: 'submittedAt', width: 25 }
    ];

    results.forEach(r => {
      worksheet.addRow({
        studentName: r.User ? r.User.name : 'Unknown Student',
        studentEmail: r.User ? r.User.email : 'Unknown',
        examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
        score: r.score,
        totalMarks: r.Exam ? r.Exam.totalMarks : 'N/A',
        percentage: `${r.percentage.toFixed(2)}%`,
        passed: r.passed ? 'PASSED' : 'FAILED',
        correctAnswers: r.correctAnswers,
        wrongAnswers: r.wrongAnswers,
        submittedAt: r.ExamAttempt && r.ExamAttempt.submittedAt ? new Date(r.ExamAttempt.submittedAt).toLocaleString() : 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="exam_results.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

