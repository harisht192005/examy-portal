const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken, isAdmin);

router.post('/exams', adminController.createExam);
router.get('/exams', adminController.getExams);
router.delete('/exams/:examId', adminController.deleteExam);
router.post('/exams/:examId/notify', adminController.notifyStudents);

router.post('/questions', adminController.addQuestion);
router.post('/questions/bulk', adminController.addBulkQuestions);
router.get('/questions/:examId', adminController.getQuestions);
router.delete('/questions/:questionId', adminController.deleteQuestion);

router.get('/results', adminController.getResults);

module.exports = router;
