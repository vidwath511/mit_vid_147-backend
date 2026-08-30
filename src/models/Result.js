const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Result = sequelize.define('Result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // attemptId, studentId, and examId will be added via association
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  correctAnswers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  wrongAnswers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  unansweredQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  percentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Result;
