import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Konfiguracja transportera
export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'poczta.zenbox.pl',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: process.env.NODE_ENV !== 'production'
});

// Test połączenia z lepszym logowaniem
export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('Mail server connection successful');
        return true;
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Mail server error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        } else {
            console.error('Mail server connection failed');
        }
        return false;
    }
};

export const sendFeedbackEmail = async (feedbackData) => {
    const { category, feedback, deviceInfo } = feedbackData;
    
    const mailOptions = {
        from: `BarkSync <${process.env.EMAIL_USER}>`,
        to: process.env.FEEDBACK_EMAIL || process.env.EMAIL_USER,
        subject: `BarkSync Feedback: ${category}`,
        text: `
New Feedback Received:

Category: ${category}
Feedback: ${feedback}

Device Info:
Platform: ${deviceInfo.platform}
Version: ${deviceInfo.version}

Time: ${new Date().toLocaleString()}
        `,
        html: `
<h2>New Feedback Received</h2>
<p><strong>Category:</strong> ${category}</p>
<p><strong>Feedback:</strong> ${feedback}</p>
<h3>Device Info:</h3>
<ul>
    <li><strong>Platform:</strong> ${deviceInfo.platform}</li>
    <li><strong>Version:</strong> ${deviceInfo.version}</li>
</ul>
<p><small>Time: ${new Date().toLocaleString()}</small></p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        if (process.env.NODE_ENV !== 'production') {
            console.log('Email sent:', info.messageId);
        }
        return info;
    } catch (error) {
        console.error('Email sending failed:', error.message);
        throw new Error('Failed to send feedback email');
    }
};

// Inicjalizacja przy starcie
verifyEmailConnection().catch(console.error);

export default {
    transporter,
    sendFeedbackEmail,
    verifyEmailConnection
}; 