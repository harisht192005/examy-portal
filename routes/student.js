const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, isStudent } = require('../middleware/authMiddleware');

router.use(verifyToken, isStudent);

router.get('/metrics', studentController.getDashboardMetrics);

module.exports = router;
