const db = require('../config/db');

exports.getDashboardMetrics = async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. Basic Metrics from Results Table
        const [results] = await db.execute(`
            SELECT 
                SUM(total_questions) as totalAttended,
                SUM(correct_answers) as totalSolved,
                SUM(score) as totalScore,
                AVG(percentage) as avgAccuracy
            FROM Results 
            WHERE student_id = ?
        `, [studentId]);

        const stats = results[0];

        // 2. Difficulty Breakdown
        // Join Student_Answers with Questions to get stats per difficulty
        const [diffStats] = await db.execute(`
            SELECT 
                q.difficulty,
                COUNT(sa.id) as total_answered,
                SUM(CASE WHEN sa.selected_option = q.correct_answer THEN 1 ELSE 0 END) as correct_count
            FROM Student_Answers sa
            JOIN Questions q ON sa.question_id = q.id
            WHERE sa.student_id = ?
            GROUP BY q.difficulty
        `, [studentId]);

        const difficulty = {
            easy: { solved: 0, total: 100 }, // Total can be scaled or dynamic
            medium: { solved: 0, total: 120 },
            hard: { solved: 0, total: 50 }
        };

        diffStats.forEach(row => {
            const d = row.difficulty.toLowerCase();
            if (difficulty[d]) {
                difficulty[d].solved = parseInt(row.correct_count) || 0;
                // Currently setting total as a static max for the UI progress bar, 
                // but we could count all questions in the system too.
                // For now, let's make it look proportional.
            }
        });

        // 3. Heatmap Data (Activity by Date)
        const [activity] = await db.execute(`
            SELECT DATE(submitted_at) as date, COUNT(*) as count
            FROM Results
            WHERE student_id = ?
            GROUP BY DATE(submitted_at)
            ORDER BY date ASC
        `, [studentId]);

        res.json({
            totalSolved: parseInt(stats.totalSolved) || 0,
            totalQuestions: parseInt(stats.totalAttended) || 1, // Avoid division by zero
            mcqAttended: parseInt(stats.totalAttended) || 0,
            mcqScore: parseFloat(stats.totalScore) || 0,
            mcqAccuracy: parseFloat(stats.avgAccuracy)?.toFixed(1) || 0,
            difficulty: {
                easy: difficulty.easy,
                med: difficulty.medium,
                hard: difficulty.hard
            },
            activity: activity.map(a => ({
                date: a.date,
                count: a.count
            }))
        });

    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
