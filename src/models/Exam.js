const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  passingMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
  },
  endTime: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'completed'),
    allowNull: false,
    defaultValue: 'draft',
  },
  // createdBy will be added via association
}, {
  timestamps: true,
});

module.exports = Exam;
