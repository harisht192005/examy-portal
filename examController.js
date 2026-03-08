const db = require('../config/db');

// Get Available Exams for Student
exports.getAvailableExams = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Find exams the student hasn't taken yet
        const query = `
            SELECT e.id, e.title, e.duration, e.total_marks, e.created_at
            FROM Exams e
            WHERE e.is_active = TRUE
            AND e.id NOT IN (
                SELECT exam_id FROM Results WHERE student_id = ?
            )
            ORDER BY e.created_at DESC
        `;
        const [exams] = await db.execute(query, [studentId]);
        res.json(exams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Start Exam - Get Questions
exports.startExam = async (req, res) => {
    try {
        const examId = req.params.examId;
        const studentId = req.user.id;

        // Ensure exam is active and student hasn't taken it
        const [results] = await db.execute('SELECT id FROM Results WHERE student_id = ? AND exam_id = ?', [studentId, examId]);
        if (results.length > 0) {
            return res.status(400).json({ error: 'You have already taken this exam' });
        }

        const [exams] = await db.execute('SELECT * FROM Exams WHERE id = ? AND is_active = TRUE', [examId]);
        if (exams.length === 0) {
            return res.status(404).json({ error: 'Exam not found or inactive' });
        }

        // Fetch questions but DO NOT send correct_answer to client
        const [questions] = await db.execute(
            'SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d FROM Questions WHERE exam_id = ? ORDER BY RAND()',
            [examId]
        );

        res.json({
            exam: { id: exams[0].id, title: exams[0].title, duration: exams[0].duration, total_marks: exams[0].total_marks },
            questions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Submit Exam
exports.submitExam = async (req, res) => {
    try {
        const examId = req.params.examId;
        const studentId = req.user.id;
        const { answers } = req.body; // Array of { question_id, selected_option }

        // Check if already submitted
        const [existing] = await db.execute('SELECT id FROM Results WHERE student_id = ? AND exam_id = ?', [studentId, examId]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Exam already submitted' });
        }

        // Get actual questions and correct answers
        const [questions] = await db.execute('SELECT id, correct_answer FROM Questions WHERE exam_id = ?', [examId]);

        let correctCount = 0;
        let incorrectCount = 0;
        const totalQuestions = questions.length;

        // Map answers
        const answerMap = {};
        if (answers && Array.isArray(answers)) {
            answers.forEach(a => {
                answerMap[a.question_id] = a.selected_option;
            });
        }

        const examResultDetails = [];

        for (const q of questions) {
            const studentAnswer = answerMap[q.id] || null;
            if (studentAnswer === q.correct_answer) {
                correctCount++;
            } else if (studentAnswer !== null) {
                incorrectCount++;
            }
            examResultDetails.push([studentId, examId, q.id, studentAnswer]);
        }

        // Calculate score (assuming 1 mark per question, 0.25 negative mark for wrong answer)
        // If "total_marks" is defined per exam, we can scale it.
        const [examInfo] = await db.execute('SELECT total_marks FROM Exams WHERE id = ?', [examId]);
        const marksPerQuestion = totalQuestions > 0 ? examInfo[0].total_marks / totalQuestions : 0;
        const negativeMark = marksPerQuestion * 0.25;

        // Calculate final score
        let rawScore = (correctCount * marksPerQuestion) - (incorrectCount * negativeMark);
        if (rawScore < 0) rawScore = 0; // Ensure no negative total score

        let percentage = totalQuestions > 0 ? (rawScore / examInfo[0].total_marks) * 100 : 0;
        const passFail = percentage >= 40 ? 'Pass' : 'Fail';

        // Begin DB Transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert student answers if there are any
            if (examResultDetails.length > 0) {
                const insertAnswersQuery = 'INSERT INTO Student_Answers (student_id, exam_id, question_id, selected_option) VALUES ?';
                await connection.query(insertAnswersQuery, [examResultDetails]);
            }

            // Insert Result
            const insertResultQuery = `
                INSERT INTO Results (student_id, exam_id, score, percentage, total_questions, correct_answers, incorrect_answers, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await connection.execute(insertResultQuery, [
                studentId, examId, rawScore, percentage, totalQuestions, correctCount, incorrectCount, passFail
            ]);

            await connection.commit();
            res.json({ message: 'Exam submitted successfully', resultId: result.insertId });
        } catch (trxError) {
            await connection.rollback();
            throw trxError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get Student Results
exports.getStudentResults = async (req, res) => {
    try {
        const studentId = req.user.id;
        const query = `
            SELECT r.id, r.score, r.percentage, r.status, r.submitted_at, 
                   e.title as exam_title, e.total_marks
            FROM Results r
            JOIN Exams e ON r.exam_id = e.id
            WHERE r.student_id = ?
            ORDER BY r.submitted_at DESC
        `;
        const [results] = await db.execute(query, [studentId]);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get Specific Result Details
exports.getResultDetails = async (req, res) => {
    try {
        const studentId = req.user.id;
        const resultId = req.params.resultId;

        const [results] = await db.execute(`
            SELECT r.*, e.title 
            FROM Results r 
            JOIN Exams e ON r.exam_id = e.id 
            WHERE r.id = ? AND r.student_id = ?
        `, [resultId, studentId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
