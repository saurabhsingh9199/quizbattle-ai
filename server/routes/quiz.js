const express = require('express');
const Quiz = require('../models/Quiz');
const { protect, adminOnly } = require('../middleware/auth');
const { aiGenerateRateLimit } = require('../middleware/aiRateLimit');
const {
  validateGenerateRequest,
  validateQuizForSave,
  generateQuizWithAI,
} = require('../services/aiQuizService');

const router = express.Router();

// Sample questions for demo
const sampleQuizzes = [
  {
    title: '🌍 World Geography Challenge',
    description: 'Test your knowledge of world geography!',
    category: 'Geography',
    difficulty: 'Medium',
    questions: [
      {
        question: 'What is the capital of Australia?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
        correctAnswer: 2,
        timeLimit: 20,
        points: 100,
      },
      {
        question: 'Which is the largest ocean on Earth?',
        options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
        correctAnswer: 3,
        timeLimit: 15,
        points: 100,
      },
      {
        question: 'Mount Everest is located in which mountain range?',
        options: ['Alps', 'Andes', 'Himalayas', 'Rockies'],
        correctAnswer: 2,
        timeLimit: 20,
        points: 150,
      },
      {
        question: 'What is the longest river in the world?',
        options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
        correctAnswer: 1,
        timeLimit: 20,
        points: 100,
      },
      {
        question: 'Which country has the most natural lakes?',
        options: ['Russia', 'USA', 'Canada', 'Brazil'],
        correctAnswer: 2,
        timeLimit: 25,
        points: 200,
      },
    ],
  },
  {
    title: '💻 Tech & Science Trivia',
    description: 'How well do you know technology and science?',
    category: 'Technology',
    difficulty: 'Hard',
    questions: [
      {
        question: 'What does "HTTP" stand for?',
        options: ['HyperText Transfer Protocol', 'High Tech Transfer Process', 'Hyper Transfer Text Program', 'Host Text Transfer Protocol'],
        correctAnswer: 0,
        timeLimit: 20,
        points: 100,
      },
      {
        question: 'Who invented the World Wide Web?',
        options: ['Bill Gates', 'Steve Jobs', 'Tim Berners-Lee', 'Linus Torvalds'],
        correctAnswer: 2,
        timeLimit: 20,
        points: 150,
      },
      {
        question: 'What is the speed of light (approximately)?',
        options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'],
        correctAnswer: 0,
        timeLimit: 15,
        points: 200,
      },
      {
        question: 'What programming language was JavaScript originally called?',
        options: ['LiveScript', 'WebScript', 'NetScript', 'BrowserScript'],
        correctAnswer: 0,
        timeLimit: 20,
        points: 150,
      },
      {
        question: 'How many bits are in a byte?',
        options: ['4', '16', '8', '32'],
        correctAnswer: 2,
        timeLimit: 10,
        points: 100,
      },
    ],
  },
  {
    title: '🎬 Pop Culture & Entertainment',
    description: 'Movies, music, and more!',
    category: 'Entertainment',
    difficulty: 'Easy',
    questions: [
      {
        question: 'Which movie features the song "Let It Go"?',
        options: ['Tangled', 'Moana', 'Frozen', 'Brave'],
        correctAnswer: 2,
        timeLimit: 15,
        points: 100,
      },
      {
        question: 'Who played Iron Man in the Marvel Cinematic Universe?',
        options: ['Chris Evans', 'Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo'],
        correctAnswer: 1,
        timeLimit: 15,
        points: 100,
      },
      {
        question: 'Which band performed "Bohemian Rhapsody"?',
        options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'],
        correctAnswer: 2,
        timeLimit: 15,
        points: 100,
      },
      {
        question: 'What is the highest-grossing film of all time?',
        options: ['Titanic', 'Avengers: Endgame', 'Avatar', 'Star Wars'],
        correctAnswer: 2,
        timeLimit: 20,
        points: 150,
      },
      {
        question: 'Which streaming platform produced "Stranger Things"?',
        options: ['HBO', 'Amazon Prime', 'Disney+', 'Netflix'],
        correctAnswer: 3,
        timeLimit: 15,
        points: 100,
      },
    ],
  },
];

// Get sample quizzes (no auth) — must be before /:id
router.get('/public/samples', async (req, res) => {
  res.json({ success: true, samples: sampleQuizzes });
});

// ─── AI Quiz Generation ───────────────────────────────────────────────────────
// ─── AI Mock Test Generation ─────────────────────────────────────────────────
router.post('/generate-mock', protect, aiGenerateRateLimit, async (req, res) => {
  try {
    const examType = typeof req.body.examType === 'string' ? req.body.examType.trim() : '';
    const examName = typeof req.body.examName === 'string' ? req.body.examName.trim() : '';
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
    const difficulty = req.body.difficulty || 'Medium';
    const numQuestions = Number(req.body.numQuestions || 10);
    const durationMinutes = Number(req.body.durationMinutes || 20);
    const negativeMarking = Number(req.body.negativeMarking || 0);
    const generateExplanations = req.body.generateExplanations !== false;

    const errors = [];
    if (!subject || subject.length < 2) errors.push('Subject is required');
    if (subject.length > 120) errors.push('Subject must be 120 characters or fewer');
    if (examName.length > 120) errors.push('Exam name must be 120 characters or fewer');
    if (topic.length > 200) errors.push('Topic must be 200 characters or fewer');
    if (!['Easy', 'Medium', 'Hard', 'Expert'].includes(difficulty)) errors.push('Invalid difficulty');
    if (![5, 10, 15, 20].includes(numQuestions)) errors.push('Questions must be 5, 10, 15, or 20');
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) errors.push('Duration must be between 5 and 180 minutes');
    if (![0, 0.25, 0.5, 1].includes(negativeMarking)) errors.push('Negative marking must be 0, 0.25, 0.5, or 1');
    if (errors.length) return res.status(400).json({ success: false, message: errors.join('; '), code: 'INVALID_INPUT' });

    const focus = [examName, subject, topic].filter(Boolean).join(' — ');
    const quiz = await generateQuizWithAI({
      topic: focus,
      category: examType || subject,
      difficulty,
      numQuestions,
      generateExplanations,
      extraInstructions: `Create a serious exam-style mock test. Exam type: ${examType || 'General assessment'}. Exam name: ${examName || 'Custom mock test'}. Subject: ${subject}. ${topic ? `Specific topic: ${topic}.` : ''} Questions must match the expected academic/competitive exam style, cover the subject broadly, avoid trivia unless appropriate for the exam, and use realistic distractors. Return questions suitable for timed assessment.`,
    });

    quiz.title = `${examName || subject} Mock Test`;
    quiz.description = `AI-generated ${examType || 'assessment'} mock test for ${subject}${topic ? ` — ${topic}` : ''}.`;
    quiz.category = examType || subject;
    quiz.mockTest = true;
    quiz.examType = examType || 'General';
    quiz.examName = examName || subject;
    quiz.subject = subject;
    quiz.durationMinutes = durationMinutes;
    quiz.negativeMarking = negativeMarking;
    quiz.questions = quiz.questions.map((q) => ({ ...q, timeLimit: Math.max(15, Math.round((durationMinutes * 60) / numQuestions)) }));

    res.json({ success: true, mockTest: quiz });
  } catch (error) {
    console.error('AI mock test generation error:', error.code || 'UNKNOWN', error.message);
    const statusMap = { GEMINI_RATE_LIMIT: 429, GEMINI_QUOTA: 402, INVALID_AI_RESPONSE: 422, API_AUTH: 503, API_NOT_CONFIGURED: 503, INVALID_MODEL: 503, NETWORK_ERROR: 503, API_ERROR: 502 };
    res.status(statusMap[error.code] || 500).json({ success: false, message: error.message || 'Unable to generate mock test right now. Please try again.', code: error.code || 'SERVER_ERROR' });
  }
});


/**
 * POST /api/quiz/generate
 * Generates a quiz via Gemini. Returns preview data only — not saved until /save-generated.
 * Protected by JWT + rate limiting. GEMINI_API_KEY never leaves the server.
 */
router.post('/generate', protect, aiGenerateRateLimit, async (req, res) => {
  try {
    const validation = validateGenerateRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join('; '),
        code: 'INVALID_INPUT',
      });
    }

    const quizData = await generateQuizWithAI(validation.data);

    res.json({
      success: true,
      quiz: quizData,
      message: 'Quiz generated successfully. Review and save when ready.',
    });
  } catch (error) {
    console.error('AI quiz generation error:', error.code || 'UNKNOWN', error.message);

    if (error.code === 'GEMINI_RATE_LIMIT') {
      return res.status(429).json({ success: false, message: error.message, code: 'GEMINI_RATE_LIMIT' });
    }
    if (error.code === 'GEMINI_QUOTA') {
      return res.status(402).json({ success: false, message: error.message, code: 'GEMINI_QUOTA' });
    }
    if (error.code === 'INVALID_AI_RESPONSE') {
      return res.status(422).json({ success: false, message: error.message, code: 'INVALID_AI_RESPONSE' });
    }
    if (error.code === 'API_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message: 'Gemini API configuration error. Please check the server API key.',
        code: 'API_NOT_CONFIGURED',
      });
    }
    if (error.code === 'API_AUTH') {
      return res.status(503).json({ success: false, message: error.message, code: 'API_AUTH' });
    }
    if (error.code === 'INVALID_MODEL') {
      return res.status(503).json({ success: false, message: error.message, code: 'INVALID_MODEL' });
    }
    if (error.code === 'NETWORK_ERROR') {
      return res.status(503).json({ success: false, message: error.message, code: 'NETWORK_ERROR' });
    }
    if (error.code === 'API_ERROR') {
      return res.status(502).json({ success: false, message: error.message, code: 'API_ERROR' });
    }

    res.status(500).json({
      success: false,
      message: 'Unable to generate the quiz right now. Please try again.',
      code: 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/quiz/save-generated
 * Saves an AI-generated (possibly edited) quiz to MongoDB.
 * Re-validates all questions server-side before persisting.
 */
router.post('/save-generated', protect, async (req, res) => {
  try {
    const validation = validateQuizForSave(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join('; '),
        code: 'INVALID_INPUT',
      });
    }

    const quiz = await Quiz.create({
      ...validation.data,
      creator: req.user._id,
    });

    res.status(201).json({ success: true, quiz, message: 'Quiz saved successfully' });
  } catch (error) {
    console.error('Save generated quiz error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save quiz to database',
      code: 'DATABASE_ERROR',
    });
  }
});

/**
 * PUT /api/quiz/:id/update-generated
 * Updates a previously saved AI quiz owned by the current user.
 */
router.put('/:id/update-generated', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const isOwner = quiz.creator?.toString() === req.user._id?.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this quiz' });
    }

    const validation = validateQuizForSave(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join('; '),
        code: 'INVALID_INPUT',
      });
    }

    Object.assign(quiz, validation.data);
    await quiz.save();

    res.json({ success: true, quiz, message: 'Quiz updated successfully' });
  } catch (error) {
    console.error('Update generated quiz error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      code: 'DATABASE_ERROR',
    });
  }
});

// Daily challenge: deterministic public quiz selection for the current UTC day.
router.get('/daily/challenge', async (req, res) => {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(start);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const quizzes = await Quiz.find({ isPublic: true }).sort({ createdAt: 1 }).limit(100).lean();
    const pool = quizzes.length ? quizzes : sampleQuizzes;
    const dayNumber = Math.floor(start.getTime() / 86400000);
    const selected = pool[dayNumber % pool.length];
    const questions = (selected.questions || []).slice(0, 10).map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      timeLimit: q.timeLimit || 20,
      points: q.points || 100,
      category: q.category || selected.category || 'General',
    }));
    res.json({
      success: true,
      challenge: {
        date: start.toISOString().slice(0, 10),
        expiresAt: tomorrow.toISOString(),
        title: `Daily Challenge — ${selected.title}`,
        category: selected.category || 'General',
        difficulty: selected.difficulty || 'Medium',
        questions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all public quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublic: true })
      .populate('creator', 'username avatar')
      .sort('-createdAt')
      .limit(20);

    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed sample quizzes (dev only)
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    const seeded = [];
    for (const q of sampleQuizzes) {
      const quiz = await Quiz.create({ ...q, creator: req.user._id });
      seeded.push(quiz);
    }
    res.json({ success: true, message: `Seeded ${seeded.length} quizzes`, quizzes: seeded });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('creator', 'username avatar');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create quiz (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, creator: req.user._id });
    res.status(201).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
