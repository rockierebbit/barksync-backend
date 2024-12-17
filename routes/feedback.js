import express from 'express';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Rate limiting
const feedbackLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 godzina
    max: 10, // limit 10 feedbacków na godzinę
    message: {
        success: false,
        error: 'Too many feedback submissions, please try again later'
    }
});

// Cache dla transportera
let cachedTransporter = null;
let lastTransporterCreation = 0;
const TRANSPORTER_TTL = 30 * 60 * 1000; // 30 minut

// Konfiguracja OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

// Ustawienie refresh tokena
oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Tworzenie transportera z accessTokenem
const createTransporter = async () => {
    try {
        // Sprawdź czy cached transporter jest wciąż ważny
        if (cachedTransporter && (Date.now() - lastTransporterCreation) < TRANSPORTER_TTL) {
            return cachedTransporter;
        }

        console.log('Creating new email transporter...');
        const accessToken = await oauth2Client.getAccessToken();
        
        cachedTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.GOOGLE_CLIENT_ID_WEB,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token
            }
        });

        lastTransporterCreation = Date.now();
        return cachedTransporter;
    } catch (error) {
        console.error('Error creating transporter:', error);
        cachedTransporter = null;
        throw error;
    }
};

router.post('/submit', feedbackLimiter, async (req, res) => {
    try {
        console.log('Feedback submission received');
        const { category, feedback, deviceInfo } = req.body;

        // Walidacja danych
        if (!category || !feedback || !deviceInfo) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Tworzenie transportera z aktualnym access tokenem
        const transporter = await createTransporter();
        
        const mailOptions = {
            from: 'BarkSync App <syncbark@gmail.com>',
            to: 'syncbark@gmail.com',
            subject: `BarkSync Feedback: ${category}`,
            html: `
                <h2>BarkSync Feedback</h2>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Feedback:</strong> ${feedback}</p>
                <h3>Device Info:</h3>
                <ul>
                    <li><strong>Platform:</strong> ${deviceInfo.platform}</li>
                    <li><strong>Version:</strong> ${deviceInfo.version}</li>
                    <li><strong>Bundle ID:</strong> ${deviceInfo.bundleId || 'com.barksync.app'}</li>
                </ul>
                <p><small>Timestamp: ${new Date().toISOString()}</small></p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Feedback email sent successfully');

        res.status(200).json({ 
            success: true,
            message: 'Feedback sent successfully'
        });
    } catch (error) {
        console.error('Error sending feedback:', error);
        
        // Szczegółowa obsługa błędów
        if (error.code === 'EAUTH') {
            cachedTransporter = null; // Reset transportera przy błędzie autoryzacji
            return res.status(500).json({
                success: false,
                error: 'Email authentication failed'
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Could not send feedback',
            details: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

export default router; 