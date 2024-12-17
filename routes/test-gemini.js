import express from 'express';
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const model = getGenAI().getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(req.body.testPrompt);
        res.json({
            success: true,
            response: result.response.text()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router; 