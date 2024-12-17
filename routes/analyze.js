import express from 'express';
import multer from 'multer';
import { audioAnalyzer } from '../services/audioAnalysis.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Upewnij się, że katalog uploads istnieje
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Multer destination called');
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        console.log('Multer filename called:', file);
        cb(null, `${Date.now()}.wav`);
    }
});

const upload = multer({ storage });

router.post('/', upload.single('audio'), async (req, res) => {
    try {
        console.log('=== Analyze endpoint hit ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('File:', req.file);

        if (!req.file) {
            throw new Error('No audio file received');
        }

        // Wstępne przetwarzanie
        const preprocessed = await audioAnalyzer.preprocessAudio(req.file.path);
        
        // Pełna analiza z nową implementacją
        const analysis = await audioAnalyzer.analyzeAudio({
            path: req.file.path,
            ...preprocessed
        });

        // Przygotuj odpowiedź w nowym formacie
        const response = {
            success: true,
            audioCharacteristics: {
                classification: {
                    barkType: analysis.audioCharacteristics.classification.barkType,
                    emotionalState: analysis.audioCharacteristics.classification.emotionalState
                },
                timing: analysis.audioCharacteristics.timing,
                intensity: analysis.audioCharacteristics.intensity
            },
            analysis: {
                aiInterpretation: analysis.analysis.aiInterpretation
            },
            timestamp: new Date().toISOString()
        };

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        // Cleanup
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
    }
});

export default router; 