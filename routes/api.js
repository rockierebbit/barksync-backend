import express from 'express';
import multer from 'multer';
import { audioAnalyzer } from '../services/audioAnalysis.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Upewnij się, że katalog uploads istnieje
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Konfiguracja multer dla plików audio
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}.wav`)
});

const upload = multer({ storage });

// Endpoint do analizy audio
router.post('/analyze', upload.single('audio'), async (req, res) => {
    try {
        console.log('Received audio file:', req.file);
        
        // Używamy audioAnalyzer do analizy
        const audioData = await audioAnalyzer.preprocessAudio(req.file.path);
        const analysis = await audioAnalyzer.analyzeAudio(audioData);
        const interpretation = audioAnalyzer.interpretResults(analysis);

        res.json({
            success: true,
            analysis: interpretation
        });
    } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).json({ error: 'Failed to process audio' });
    }
});

// Endpoint do zapisywania konwersacji
router.post('/conversations', async (req, res) => {
    try {
        const { analysis } = req.body;
        // Tu możesz dodać zapis do bazy danych
        res.json({ success: true, message: 'Conversation saved' });
    } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).json({ error: 'Failed to save conversation' });
    }
});

// Endpoint do pobierania historii konwersacji
router.get('/conversations', async (req, res) => {
    try {
        // Mock historii konwersacji
        const conversations = [];
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Endpoint do testowania Gemini
router.post('/test-gemini', async (req, res) => {
    try {
        const { testPrompt } = req.body;
        res.json({ response: "Gemini API test response" });
    } catch (error) {
        console.error('Error testing Gemini:', error);
        res.status(500).json({ error: 'Failed to test Gemini' });
    }
});

// Endpoint do chatu
router.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        res.json({ content: "Chat response from server" });
    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Chat failed' });
    }
});

// Endpoint do feedbacku
router.post('/feedback', async (req, res) => {
    try {
        const { feedback } = req.body;
        res.json({ message: 'Feedback received' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

export default router; 