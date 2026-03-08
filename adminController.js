const db = require('../config/db');
const emailService = require('../services/emailService');

// Create Exam
exports.createExam = async (req, res) => {
    try {
        const { title, duration, total_marks } = req.body;
        if (!title || !duration || !total_marks) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.execute(
            'INSERT INTO Exams (title, duration, total_marks, created_by) VALUES (?, ?, ?, ?)',
            [title, duration, total_marks, req.user.id]
        );

        res.status(201).json({ message: 'Exam created successfully', examId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Notify Students manually
exports.notifyStudents = async (req, res) => {
    try {
        const examId = req.params.examId;
        const [exams] = await db.execute('SELECT title, duration, total_marks FROM Exams WHERE id = ?', [examId]);

        if (exams.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const exam = exams[0];
        // Asynchronous call, don't await to avoid blocking the response
        emailService.sendExamNotification(exam);

        res.json({ message: 'Notification broadcast started successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get All Exams
exports.getExams = async (req, res) => {
    try {
        const query = `
            SELECT e.*, COUNT(q.id) as total_questions 
            FROM Exams e 
            LEFT JOIN Questions q ON e.id = q.exam_id 
            GROUP BY e.id 
            ORDER BY e.created_at DESC
        `;
        const [exams] = await db.execute(query);
        res.json(exams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Add Question
exports.addQuestion = async (req, res) => {
    try {
        const { exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer } = req.body;

        if (!exam_id || !question_text || !option_a || !option_b || !correct_answer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.execute(
            'INSERT INTO Questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [exam_id, question_text, option_a, option_b, option_c || null, option_d || null, correct_answer]
        );
        res.status(201).json({ message: 'Question added successfully', questionId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Add Bulk Questions
exports.addBulkQuestions = async (req, res) => {
    try {
        const { exam_id, questions } = req.body;

        if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'Missing exam_id or questions array' });
        }

        // Validate all questions first
        for (const q of questions) {
            if (!q.question_text || !q.option_a || !q.option_b || !q.correct_answer) {
                return res.status(400).json({ error: 'One or more questions are missing required fields' });
            }
        }

        // Insert questions
        const insertPromises = questions.map(q => {
            return db.execute(
                'INSERT INTO Questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [exam_id, q.question_text, q.option_a, q.option_b, q.option_c || null, q.option_d || null, q.correct_answer]
            );
        });

        await Promise.all(insertPromises);

        res.status(201).json({ message: `${questions.length} questions added successfully.` });
    } catch (error) {
        console.error('Bulk Insert Error:', error);
        res.status(500).json({ error: 'Internal server error during bulk insert' });
    }
};

// Get Questions for an Exam
exports.getQuestions = async (req, res) => {
    try {
        const examId = req.params.examId;
        const [questions] = await db.execute('SELECT * FROM Questions WHERE exam_id = ?', [examId]);
        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete Question
exports.deleteQuestion = async (req, res) => {
    try {
        const questionId = req.params.questionId;
        await db.execute('DELETE FROM Questions WHERE id = ?', [questionId]);
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete Exam
exports.deleteExam = async (req, res) => {
    try {
        const examId = req.params.examId;
        await db.execute('DELETE FROM Exams WHERE id = ?', [examId]);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get All Results
exports.getResults = async (req, res) => {
    try {
        const query = `
            SELECT r.id, r.score, r.percentage, r.status, r.submitted_at, 
                   u.name as student_name, u.email as student_email,
                   e.title as exam_title
            FROM Results r
            JOIN Users u ON r.student_id = u.id
            JOIN Exams e ON r.exam_id = e.id
            ORDER BY r.submitted_at DESC
        `;
        const [results] = await db.execute(query);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
