import express from 'express';
import { getGenAI } from '../services/gemini.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting dla endpointu chat
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 50, // limit 50 requestów na okno
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    }
});

// Cache dla podobnych zapytań
const responseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minut

router.post('/', chatLimiter, async (req, res) => {
    try {
        console.log('Chat request received:', req.body);
        const { message, context } = req.body;

        // Sprawdź czy mamy klucz API
        if (!process.env.GOOGLE_AI_API_KEY) {
            throw new Error('GOOGLE_AI_API_KEY not found');
        }

        // Generuj klucz cache
        const cacheKey = JSON.stringify({ message, context });
        
        // Sprawdź cache
        if (responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                console.log('Returning cached response');
                return res.json(cached.response);
            }
            responseCache.delete(cacheKey);
        }

        // Ulepszone instrukcje dla Gemini
        const prompt = `
You are BarkSync AI - an expert dog behavior analyst and trainer. Your role is to help interpret dog vocalizations and provide actionable advice.

BARK ANALYSIS DATA:
${context.map(msg => `${msg.type}: ${msg.text}`).join('\n')}

USER QUESTION: "${message}"

Provide a detailed response that:
1. Directly addresses the user's question
2. References specific data from the bark analysis
3. Explains the behavioral and emotional implications
4. Gives practical, actionable advice
5. Uses a friendly, professional tone

Focus on being:
- Specific and detailed in your explanations
- Practical in your recommendations
- Educational but accessible
- Empathetic to both dog and owner

Response format:
1. Start with a direct answer to the question
2. Support with relevant data from the analysis
3. End with specific recommendations`;

        const model = getGenAI().getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = {
            success: true,
            content: result.response.text()
        };

        // Zapisz w cache
        responseCache.set(cacheKey, {
            response,
            timestamp: Date.now()
        });

        console.log('Sending chat response:', response);
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        
        // Szczegółowa odpowiedź błędu
        const errorResponse = {
            success: false,
            error: error.message,
            details: error.errorDetails || null
        };

        if (error.message.includes('API_KEY_INVALID')) {
            errorResponse.error = 'Invalid API key configuration';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            errorResponse.error = 'API quota exceeded';
        }

        res.status(500).json(errorResponse);
    }
});

// Czyszczenie cache co godzinę
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            responseCache.delete(key);
        }
    }
}, 60 * 60 * 1000);

export default router; 