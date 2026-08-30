-- =============================================================================
-- ExamHub - Database Schema Definition Script
-- Target Database: MySQL 8.0+ / MariaDB 10.3+ / TiDB
-- =============================================================================

-- Disable foreign key checks during schema creation/import
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- -----------------------------------------------------------------------------
-- Table 1: Users
-- Description: Stores authentication credentials and profiles for Admins & Students
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 2: Exams
-- Description: Stores exam configurations created by Admins
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Exams` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `duration` INT NOT NULL COMMENT 'Duration in minutes',
  `totalMarks` INT NOT NULL,
  `passingMarks` INT NOT NULL,
  `startTime` DATETIME NULL,
  `endTime` DATETIME NULL,
  `status` ENUM('draft', 'published', 'completed') NOT NULL DEFAULT 'draft',
  `createdBy` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exams_createdBy` (`createdBy`),
  CONSTRAINT `fk_exams_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 3: Questions
-- Description: Question bank items with 4 options and marking scheme
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `questionText` TEXT NOT NULL,
  `optionA` VARCHAR(255) NOT NULL,
  `optionB` VARCHAR(255) NOT NULL,
  `optionC` VARCHAR(255) NOT NULL,
  `optionD` VARCHAR(255) NOT NULL,
  `correctAnswer` ENUM('A', 'B', 'C', 'D') NOT NULL,
  `marks` INT NOT NULL DEFAULT 1,
  `negativeMarks` FLOAT NOT NULL DEFAULT 0,
  `createdBy` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_questions_createdBy` (`createdBy`),
  CONSTRAINT `fk_questions_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 4: ExamQuestions (Junction Table)
-- Description: Many-to-Many association between Exams and Questions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ExamQuestions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `examId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `questionOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_exam_question_unique` (`examId`, `questionId`),
  KEY `idx_examquestions_examId` (`examId`),
  KEY `idx_examquestions_questionId` (`questionId`),
  CONSTRAINT `fk_examquestions_examId` FOREIGN KEY (`examId`) REFERENCES `Exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_examquestions_questionId` FOREIGN KEY (`questionId`) REFERENCES `Questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 5: ExamAttempts
-- Description: Student exam attempts, tracking lifecycle and randomized question order
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ExamAttempts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `examId` INT NOT NULL,
  `startedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submittedAt` DATETIME NULL,
  `status` ENUM('not_started', 'in_progress', 'submitted', 'auto_submitted') NOT NULL DEFAULT 'not_started',
  `questionOrder` JSON NULL COMMENT 'Array of randomized question IDs for consistent attempt order',
  PRIMARY KEY (`id`),
  KEY `idx_examattempts_studentId` (`studentId`),
  KEY `idx_examattempts_examId` (`examId`),
  CONSTRAINT `fk_examattempts_studentId` FOREIGN KEY (`studentId`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_examattempts_examId` FOREIGN KEY (`examId`) REFERENCES `Exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 6: Answers
-- Description: Auto-saved and submitted student responses per question in an attempt
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Answers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `attemptId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `selectedAnswer` ENUM('A', 'B', 'C', 'D') NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_answers_attemptId` (`attemptId`),
  KEY `idx_answers_questionId` (`questionId`),
  CONSTRAINT `fk_answers_attemptId` FOREIGN KEY (`attemptId`) REFERENCES `ExamAttempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_answers_questionId` FOREIGN KEY (`questionId`) REFERENCES `Questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 7: Results
-- Description: Computed scorecard results, statistics, and pass/fail determination
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Results` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `attemptId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `examId` INT NOT NULL,
  `score` FLOAT NOT NULL,
  `correctAnswers` INT NOT NULL DEFAULT 0,
  `wrongAnswers` INT NOT NULL DEFAULT 0,
  `unansweredQuestions` INT NOT NULL DEFAULT 0,
  `percentage` FLOAT NOT NULL,
  `passed` TINYINT(1) NOT NULL COMMENT '1 = true (passed), 0 = false (failed)',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_results_attemptId` (`attemptId`),
  KEY `idx_results_studentId` (`studentId`),
  KEY `idx_results_examId` (`examId`),
  CONSTRAINT `fk_results_attemptId` FOREIGN KEY (`attemptId`) REFERENCES `ExamAttempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_results_studentId` FOREIGN KEY (`studentId`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_results_examId` FOREIGN KEY (`examId`) REFERENCES `Exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
