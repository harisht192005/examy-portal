const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { verifyToken, isStudent } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/available', isStudent, examController.getAvailableExams);
router.get('/:examId/start', isStudent, examController.startExam);
router.post('/:examId/submit', isStudent, examController.submitExam);
router.get('/results/:resultId', examController.getResultDetails);

module.exports = router;
