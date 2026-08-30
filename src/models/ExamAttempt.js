const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExamAttempt = sequelize.define('ExamAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // examId and studentId will be added via association
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  submittedAt: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'submitted', 'auto_submitted'),
    allowNull: false,
    defaultValue: 'not_started',
  },
  questionOrder: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: false,
});

module.exports = ExamAttempt;
