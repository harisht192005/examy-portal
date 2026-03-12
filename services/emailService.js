const nodemailer = require('nodemailer');
const db = require('../config/db');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: (process.env.EMAIL_HOST || '').trim(),
    port: (process.env.EMAIL_PORT || '').trim(),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: (process.env.EMAIL_USER || '').trim(),
        pass: (process.env.EMAIL_PASS || '').trim(),
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Sends a notification email to all registered students when a new exam is created.
 * @param {Object} exam - The exam object containing title, duration, and marks.
 */
exports.sendExamNotification = async (exam) => {
    try {
        // Fetch ALL users (students and admins)
        const [users] = await db.execute('SELECT email, name FROM Users');

        if (users.length === 0) {
            console.log('No users found in database to notify.');
            return;
        }

        const userEmails = users.map(u => u.email);
        console.log(`📣 Broadcasting new exam notification to ${userEmails.length} users...`);

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
            bcc: userEmails, // Use BCC to hide other recipients
            subject: `New Exam Added: ${exam.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #333;">Hello!</h2>
                    <p>A new exam has been added to the <strong>Examy Portal</strong>. Get ready to test your knowledge!</p>
                    <hr>
                    <p><strong>Exam Title:</strong> ${exam.title}</p>
                    <p><strong>Duration:</strong> ${exam.duration} minutes</p>
                    <p><strong>Total Marks:</strong> ${exam.total_marks}</p>
                    <hr>
                    <p>Log in to your dashboard to view the exam and start whenever you are ready.</p>
                    <footer style="margin-top: 20px; font-size: 12px; color: #777;">
                        Best luck,<br>
                        Examy Portal Team
                    </footer>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Notification email sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending exam notification email:', error);
    }
};
