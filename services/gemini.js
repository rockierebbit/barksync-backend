import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

let genAI = null;

export function initGenAI() {
    if (!genAI) {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        console.log('Initializing Gemini with API key:', apiKey);
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY not found in environment variables');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export function getGenAI() {
    if (!genAI) {
        initGenAI();
    }
    return genAI;
} 