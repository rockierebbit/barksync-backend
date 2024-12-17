import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeRoutes from './routes/analyze.js';
import authRoutes from './routes/auth.js';
import feedbackRoutes from './routes/feedback.js';
import testGeminiRoutes from './routes/test-gemini.js';
import chatRoutes from './routes/chat.js';
import settingsRoutes from './routes/settings.js';
import recordingsRoutes from './routes/recordings.js';
import fs from 'fs';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Połączenie z MongoDB z retry
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // Retry connection
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://barksync.onrender.com', 'https://app.barksync.com', 'exp://barksync.app']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Katalog na pliki z obsługą błędów
const uploadsDir = path.join(__dirname, 'uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
} catch (err) {
    console.error('Error creating uploads directory:', err);
}

// Podstawowy endpoint z więcej informacjami
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'BarkSync API is running',
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
        endpoints: {
            analyze: '/api/analyze',
            auth: '/api/auth',
            chat: '/api/chat',
            feedback: '/api/feedback'
        }
    });
});

// Health check dla Render z MongoDB check
app.get('/health', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            res.json({ 
                status: 'ok',
                mongodb: 'connected',
                uptime: process.uptime()
            });
        } else {
            res.status(503).json({ 
                status: 'error',
                mongodb: 'disconnected'
            });
        }
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/test-gemini', testGeminiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recordings', recordingsRoutes);

// Obsługa błędów z więcej szczegółami
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Something went wrong!',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode
    🔊 Listening on port ${PORT}
    📁 Upload directory: ${uploadsDir}
    🌐 CORS origins: ${process.env.NODE_ENV === 'production' 
        ? ['https://barksync.onrender.com', 'https://app.barksync.com'] 
        : '*'}
    `);
});

// Lepsze zarządzanie zamknięciem
const gracefulShutdown = async () => {
    console.log('Received shutdown signal');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;