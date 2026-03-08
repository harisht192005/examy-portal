const nodemailer = require('nodemailer');
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
        // This allows connection even if the certificate is self-signed or invalid (common in some networks)
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        console.log('------------------------------------------');
        console.log('🔍 Testing connection to:', process.env.EMAIL_HOST);
        console.log('📧 Using email:', process.env.EMAIL_USER);
        console.log('------------------------------------------');

        console.log('⏳ Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SUCCESS: SMTP connection verified successfully!');

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Examy Portal - Email Verification Test',
            text: 'This is a test email from Examy Portal to verify SMTP configuration.',
        };

        console.log('⏳ Sending test email to self...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ SUCCESS: Test email sent!');
        console.log('📄 Message ID:', info.messageId);
        console.log('------------------------------------------');
    } catch (error) {
        console.log('❌ FAILURE: Could not connect to the email server.');
        console.error('\nDetailed Error Information:');
        console.error(error);
        console.log('------------------------------------------');
        console.log('TIPS:');
        console.log('1. Double check your EMAIL_USER and EMAIL_PASS in .env');
        console.log('2. If using Gmail, make sure you enabled "App Passwords"');
        console.log('3. Ensure your internet connection allows outgoing mail on port', process.env.EMAIL_PORT);
    }
}

main();
