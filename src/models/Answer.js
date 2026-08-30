const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Answer = sequelize.define('Answer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // attemptId and questionId will be added via association
  selectedAnswer: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: true, // Can be null if question left unanswered
  },
}, {
  timestamps: true,
});

module.exports = Answer;
