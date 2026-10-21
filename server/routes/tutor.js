const express = require('express');
const { protect } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();
let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const e = new Error('GEMINI_API_KEY is not configured on the server');
    e.code = 'API_NOT_CONFIGURED';
    throw e;
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

router.post('/ask', protect, async (req, res) => {
  try {
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    const context = typeof req.body.context === 'string' ? req.body.context.trim().slice(0, 4000) : '';
    if (question.length < 2 || question.length > 1000) {
      return res.status(400).json({ success: false, message: 'Question must be between 2 and 1000 characters.' });
    }
    const prompt = `You are QuizBattle AI Tutor. Help a student learn, do not just give a one-line answer. Explain in simple English, use a short example when useful, and finish with 2 quick practice questions.\nStudent question: ${question}\n${context ? `Recent quiz context: ${context}` : ''}`;
    const result = await getClient().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: prompt,
    });
    const text = result.text || '';
    if (!text) return res.status(502).json({ success: false, message: 'AI returned an empty response.' });
    res.json({ success: true, answer: text });
  } catch (error) {
    const status = error.code === 'API_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({ success: false, message: error.message || 'AI Tutor is unavailable.' });
  }
});

module.exports = router;
