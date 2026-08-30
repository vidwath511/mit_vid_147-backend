const sequelize = require('../config/database');

const User = require('./User');
const Question = require('./Question');
const Exam = require('./Exam');
const ExamQuestion = require('./ExamQuestion');
const ExamAttempt = require('./ExamAttempt');
const Answer = require('./Answer');
const Result = require('./Result');

// 1. User (admin) -> Question
User.hasMany(Question, { foreignKey: 'createdBy' });
Question.belongsTo(User, { foreignKey: 'createdBy' });

// 2. User (admin) -> Exam
User.hasMany(Exam, { foreignKey: 'createdBy' });
Exam.belongsTo(User, { foreignKey: 'createdBy' });

// 3. Exam <-> Question (Many-to-Many)
Exam.belongsToMany(Question, { through: ExamQuestion, foreignKey: 'examId' });
Question.belongsToMany(Exam, { through: ExamQuestion, foreignKey: 'questionId' });

// 4. User (student) -> ExamAttempt
User.hasMany(ExamAttempt, { foreignKey: 'studentId' });
ExamAttempt.belongsTo(User, { foreignKey: 'studentId' });

// 5. Exam -> ExamAttempt
Exam.hasMany(ExamAttempt, { foreignKey: 'examId' });
ExamAttempt.belongsTo(Exam, { foreignKey: 'examId' });

// 6. ExamAttempt -> Answer
ExamAttempt.hasMany(Answer, { foreignKey: 'attemptId' });
Answer.belongsTo(ExamAttempt, { foreignKey: 'attemptId' });

// Question -> Answer
Question.hasMany(Answer, { foreignKey: 'questionId' });
Answer.belongsTo(Question, { foreignKey: 'questionId' });

// 7. ExamAttempt -> Result
ExamAttempt.hasOne(Result, { foreignKey: 'attemptId' });
Result.belongsTo(ExamAttempt, { foreignKey: 'attemptId' });

// User (student) -> Result
User.hasMany(Result, { foreignKey: 'studentId' });
Result.belongsTo(User, { foreignKey: 'studentId' });

// Exam -> Result
Exam.hasMany(Result, { foreignKey: 'examId' });
Result.belongsTo(Exam, { foreignKey: 'examId' });

module.exports = {
  sequelize,
  User,
  Question,
  Exam,
  ExamQuestion,
  ExamAttempt,
  Answer,
  Result,
};
