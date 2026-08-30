const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const examRoutes = require('./routes/examRoutes');
const studentExamRoutes = require('./routes/studentExamRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const studentDashboardRoutes = require('./routes/studentDashboardRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const adminStudentRoutes = require('./routes/adminStudentRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/student/exams', studentExamRoutes); // This mounts to /api/student/exams
app.use('/api/student', studentDashboardRoutes); // This mounts to /api/student/results and /dashboard
app.use('/api/attempts', attemptRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/students', adminStudentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running'
  });
});

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

module.exports = app;
