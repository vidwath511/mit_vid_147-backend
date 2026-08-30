const { Result, ExamAttempt, Exam, User } = require('../models');
const PDFDocument = require('pdfkit');

// GET /api/student/results
exports.getResults = async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Result.findAndCountAll({
      where: { studentId },
      include: [
        { model: Exam, attributes: ['title'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const results = rows.map(r => ({
      id: r.id,
      attemptId: r.attemptId,
      score: r.score,
      percentage: r.percentage,
      correctAnswers: r.correctAnswers,
      wrongAnswers: r.wrongAnswers,
      passed: r.passed,
      examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
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
    console.error('Error getting results:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/results/:attemptId
exports.getSingleResult = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const studentId = req.user.id;

    // Check if attempt belongs to student and is submitted
    const attempt = await ExamAttempt.findOne({
      where: { id: attemptId, studentId, status: ['submitted', 'auto_submitted'] }
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found or not submitted' });
    }

    const result = await Result.findOne({
      where: { attemptId, studentId },
      include: [{ model: Exam, attributes: ['title'] }]
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    res.json({
      success: true,
      result: {
        id: result.id,
        attemptId: result.attemptId,
        score: result.score,
        percentage: result.percentage,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        passed: result.passed,
        examTitle: result.Exam ? result.Exam.title : 'Unknown Exam',
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    console.error('Error getting single result:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    const allResults = await Result.findAll({
      where: { studentId },
      include: [
        { model: Exam, attributes: ['title'] },
        { model: ExamAttempt, attributes: ['submittedAt'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalExamsTaken = allResults.length;
    let totalPassed = 0;
    let totalFailed = 0;
    let sumPercentage = 0;
    let highestScorePercentage = 0;

    allResults.forEach(r => {
      if (r.passed) totalPassed++;
      else totalFailed++;

      sumPercentage += r.percentage;
      if (r.percentage > highestScorePercentage) {
        highestScorePercentage = r.percentage;
      }
    });

    const averageScorePercentage = totalExamsTaken > 0 ? (sumPercentage / totalExamsTaken) : 0;

    // recentResults: up to 5 most recent
    const recentResults = allResults.slice(0, 5).map(r => ({
      attemptId: r.attemptId,
      examId: r.examId,
      examTitle: r.Exam ? r.Exam.title : 'Unknown Exam',
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      submittedAt: r.ExamAttempt ? r.ExamAttempt.submittedAt : r.createdAt
    }));

    res.json({
      success: true,
      dashboard: {
        totalExamsTaken,
        totalPassed,
        totalFailed,
        averageScorePercentage: parseFloat(averageScorePercentage.toFixed(2)),
        highestScorePercentage: parseFloat(highestScorePercentage.toFixed(2)),
        recentResults
      }
    });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/results/:attemptId/pdf
exports.generatePdfScorecard = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const studentId = req.user.id;

    const attempt = await ExamAttempt.findOne({
      where: { id: attemptId, studentId, status: ['submitted', 'auto_submitted'] }
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found or not submitted' });
    }

    const result = await Result.findOne({
      where: { attemptId, studentId },
      include: [
        { model: Exam, attributes: ['title', 'totalMarks', 'passingMarks'] },
        { model: User, attributes: ['name', 'email'] }
      ]
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="scorecard-${attemptId}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Exam Scorecard', { align: 'center' });
    doc.moveDown();

    // Student Info
    doc.fontSize(12).text(`Student Name: ${result.User ? result.User.name : 'Unknown'}`);
    doc.text(`Student Email: ${result.User ? result.User.email : 'Unknown'}`);
    doc.moveDown();

    // Exam Info
    doc.text(`Exam Title: ${result.Exam ? result.Exam.title : 'Unknown'}`);
    doc.text(`Attempt ID: ${attemptId}`);
    doc.text(`Date Submitted: ${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}`);
    doc.moveDown();

    // Results Info
    doc.text(`Score: ${result.score} / ${result.Exam ? result.Exam.totalMarks : 'N/A'}`);
    doc.text(`Percentage: ${result.percentage.toFixed(2)}%`);
    doc.text(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`, {
      fillColor: result.passed ? 'green' : 'red'
    });
    doc.fillColor('black'); // Reset color
    doc.moveDown();

    doc.text(`Correct Answers: ${result.correctAnswers}`);
    doc.text(`Wrong Answers: ${result.wrongAnswers}`);
    doc.text(`Unanswered: ${result.unansweredQuestions}`);
    
    doc.end();

  } catch (error) {
    console.error('Error generating PDF scorecard:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/dashboard/results/:attemptId/pdf
exports.downloadScorecardPdf = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const studentId = req.user.id;

    // Check if attempt belongs to student and is submitted
    const attempt = await ExamAttempt.findOne({
      where: { id: attemptId, studentId, status: ['submitted', 'auto_submitted'] }
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found or not submitted' });
    }

    const result = await Result.findOne({
      where: { attemptId, studentId },
      include: [{ model: Exam, attributes: ['title'] }]
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Setup response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scorecard-${attemptId}.pdf`);
    
    // Pipe to response
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('ExamHub Scorecard', { align: 'center' });
    doc.moveDown(2);
    
    // Details
    doc.fontSize(14).font('Helvetica-Bold').text('Exam Details');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Title: ${result.Exam ? result.Exam.title : 'Unknown'}`);
    doc.text(`Student Name: ${req.user.name}`);
    doc.text(`Student Email: ${req.user.email}`);
    doc.text(`Date Submitted: ${new Date(attempt.submittedAt).toLocaleString()}`);
    doc.moveDown(1.5);
    
    // Score Details
    doc.fontSize(14).font('Helvetica-Bold').text('Result Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Score: ${result.score}`);
    doc.text(`Percentage: ${result.percentage.toFixed(2)}%`);
    doc.text(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    doc.moveDown(1);
    
    // Breakdown
    doc.fontSize(14).font('Helvetica-Bold').text('Performance Breakdown');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Correct Answers: ${result.correctAnswers}`);
    doc.text(`Wrong Answers: ${result.wrongAnswers}`);
    
    // Footer
    doc.moveDown(5);
    doc.fontSize(10).font('Helvetica-Oblique').text('Generated by ExamHub Platform', { align: 'center' });
    
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating PDF' });
    }
  }
};
