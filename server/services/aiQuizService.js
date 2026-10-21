const { GoogleGenAI } = require('@google/genai');

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const VALID_QUESTION_COUNTS = [5, 10, 15, 20];

// Points and time limits scale with difficulty — server-side only, never from client
const DIFFICULTY_CONFIG = {
  Easy: { timeLimit: 25, points: 100 },
  Medium: { timeLimit: 20, points: 125 },
  Hard: { timeLimit: 18, points: 150 },
  Expert: { timeLimit: 15, points: 200 },
};

let geminiClient = null;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is not configured on the server');
    err.code = 'API_NOT_CONFIGURED';
    throw err;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
};

const getGeminiModel = () => process.env.GEMINI_MODEL || 'gemini-3.6-flash';

/** Normalize Gemini difficulty strings (e.g. "medium") to QuizBattle enum values. */
const normalizeDifficulty = (value, fallback = 'Medium') => {
  if (!value || typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  const map = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
  };
  return map[normalized] || fallback;
};

/** Strip markdown code fences if Gemini wraps JSON unexpectedly. */
const extractJsonText = (text) => {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
};

/**
 * JSON schema for Gemini structured output.
 * correctAnswer is a string that must exactly match one of the four options.
 */
const buildQuizResponseSchema = () => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    category: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          correctAnswer: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'correctAnswer', 'explanation'],
      },
    },
  },
  required: ['title', 'category', 'difficulty', 'questions'],
});

/**
 * Validates incoming generation request from the client.
 * Rejects invalid topics and out-of-range parameters before calling Gemini.
 */
const validateGenerateRequest = (body) => {
  const errors = [];
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const difficulty = body.difficulty;
  const numQuestions = Number(body.numQuestions);
  const generateExplanations = Boolean(body.generateExplanations);

  if (!topic || topic.length < 2) {
    errors.push('Topic must be at least 2 characters');
  }
  if (topic.length > 200) {
    errors.push('Topic must be 200 characters or fewer');
  }
  if (/[<>{}]/.test(topic)) {
    errors.push('Topic contains invalid characters');
  }
  if (!category || category.length < 2) {
    errors.push('Category is required');
  }
  if (category.length > 80) {
    errors.push('Category must be 80 characters or fewer');
  }
  if (/[<>{}]/.test(category)) {
    errors.push('Category contains invalid characters');
  }
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    errors.push('Invalid difficulty level');
  }
  if (!VALID_QUESTION_COUNTS.includes(numQuestions)) {
    errors.push('Number of questions must be 5, 10, 15, or 20');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: { topic, category, difficulty, numQuestions, generateExplanations },
  };
};

/**
 * Resolves Gemini string correctAnswer to a 0-based option index.
 */
const resolveCorrectAnswerIndex = (options, correctAnswer) => {
  const trimmedOptions = options.map((o) => String(o).trim());
  const trimmedAnswer = String(correctAnswer).trim();

  const exactIndex = trimmedOptions.findIndex((opt) => opt === trimmedAnswer);
  if (exactIndex !== -1) return exactIndex;

  const lowerIndex = trimmedOptions.findIndex(
    (opt) => opt.toLowerCase() === trimmedAnswer.toLowerCase()
  );
  return lowerIndex;
};

/**
 * Validates the structured JSON returned by Gemini before it touches the database.
 * Ensures every question has exactly 4 unique options and a matching correctAnswer.
 */
const validateAIQuizPayload = (payload, expectedCount, expectedDifficulty, expectedCategory) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['AI response was not a valid object'] };
  }

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('AI response missing valid title');
  }
  if (!payload.category || typeof payload.category !== 'string' || !payload.category.trim()) {
    errors.push('AI response missing category');
  }

  const normalizedDifficulty = normalizeDifficulty(payload.difficulty, expectedDifficulty);
  if (normalizedDifficulty !== expectedDifficulty) {
    errors.push('AI response difficulty mismatch');
  }

  if (!Array.isArray(payload.questions) || payload.questions.length !== expectedCount) {
    errors.push(`AI response must contain exactly ${expectedCount} questions`);
  }

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const seenQuestions = new Set();

  questions.forEach((q, i) => {
    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
      errors.push(`Question ${i + 1} has invalid text`);
      return;
    }

    const questionKey = q.question.trim().toLowerCase();
    if (seenQuestions.has(questionKey)) {
      errors.push(`Question ${i + 1} is a duplicate`);
    } else {
      seenQuestions.add(questionKey);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`Question ${i + 1} must have exactly 4 options`);
      return;
    }

    const options = q.options.map((opt) => String(opt).trim());
    if (options.some((opt) => !opt)) {
      errors.push(`Question ${i + 1} has empty options`);
    }

    const uniqueOptions = new Set(options.map((opt) => opt.toLowerCase()));
    if (uniqueOptions.size !== 4) {
      errors.push(`Question ${i + 1} has duplicate options`);
    }

    if (q.correctAnswer == null || String(q.correctAnswer).trim() === '') {
      errors.push(`Question ${i + 1} is missing correctAnswer`);
      return;
    }

    const correctIndex = resolveCorrectAnswerIndex(options, q.correctAnswer);
    if (correctIndex === -1) {
      errors.push(`Question ${i + 1} correctAnswer does not match any option`);
    } else {
      q._resolvedCorrectIndex = correctIndex;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    questions,
    normalizedDifficulty,
    category: expectedCategory || payload.category.trim(),
  };
};

/**
 * Maps validated Gemini output into the Quiz model shape.
 * Scoring and time limits are assigned server-side — never trusted from the client.
 */
const mapToQuizDocument = (payload, { topic, category, difficulty, generateExplanations }, validation) => {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
  const resolvedCategory = category || validation.category || payload.category.trim();

  return {
    title: payload.title.trim(),
    description: `AI-generated quiz about ${topic}`,
    category: resolvedCategory,
    difficulty,
    questions: payload.questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctAnswer: q._resolvedCorrectIndex,
      timeLimit: config.timeLimit,
      points: config.points,
      category: resolvedCategory,
      explanation: generateExplanations && q.explanation ? String(q.explanation).trim() : '',
    })),
    generatedByAI: true,
    isPublic: true,
  };
};

/**
 * Classifies Gemini SDK / API errors into safe client-facing codes.
 * Never logs or exposes the API key.
 */
const classifyGeminiError = (err) => {
  const status = err.status || err.statusCode || err.response?.status;
  const message = String(err.message || '').toLowerCase();
  const apiMessage = String(err.error?.message || err.response?.data?.error?.message || '').toLowerCase();
  const combined = `${message} ${apiMessage}`;

  if (status === 429 || combined.includes('rate limit') || combined.includes('resource_exhausted')) {
    const rateErr = new Error('Gemini rate limit reached. Please wait a moment and try again.');
    rateErr.code = 'GEMINI_RATE_LIMIT';
    return rateErr;
  }

  if (
    combined.includes('quota')
    || combined.includes('billing')
    || combined.includes('exceeded your current quota')
  ) {
    const quotaErr = new Error(
      'Gemini API quota has been reached. Check your Gemini API usage and billing settings.'
    );
    quotaErr.code = 'GEMINI_QUOTA';
    return quotaErr;
  }

  if (
    status === 401
    || status === 403
    || combined.includes('api key')
    || combined.includes('permission denied')
    || combined.includes('unauthenticated')
  ) {
    const authErr = new Error('Gemini API configuration error. Please check the server API key.');
    authErr.code = 'API_AUTH';
    return authErr;
  }

  if (
    status === 404
    || combined.includes('not found')
    || combined.includes('model')
    || combined.includes('invalid model')
  ) {
    const modelErr = new Error('Gemini model configuration error. Please check GEMINI_MODEL on the server.');
    modelErr.code = 'INVALID_MODEL';
    return modelErr;
  }

  if (
    combined.includes('network')
    || combined.includes('fetch failed')
    || combined.includes('econnrefused')
    || combined.includes('enotfound')
    || combined.includes('timeout')
    || err.code === 'ECONNREFUSED'
    || err.code === 'ENOTFOUND'
    || err.code === 'ETIMEDOUT'
  ) {
    const networkErr = new Error('Unable to generate the quiz right now. Please try again.');
    networkErr.code = 'NETWORK_ERROR';
    return networkErr;
  }

  const apiErr = new Error('Unable to generate the quiz right now. Please try again.');
  apiErr.code = 'API_ERROR';
  return apiErr;
};

/**
 * Calls Gemini to generate a structured MCQ quiz.
 * Uses responseJsonSchema for predictable JSON output.
 */
const generateQuizWithAI = async ({ topic, category, difficulty, numQuestions, generateExplanations, extraInstructions = "" }) => {
  const client = getGeminiClient();
  const model = getGeminiModel();

  const explanationInstruction = generateExplanations
    ? 'Include a brief explanation for each question explaining why the correct answer is right.'
    : 'Set explanation to an empty string for every question.';

  const prompt = `Create a ${difficulty.toLowerCase()} difficulty multiple-choice quiz about "${topic}" in the "${category}" category.

Requirements:
- Exactly ${numQuestions} unique questions
- Each question must have exactly 4 distinct options
- correctAnswer must be the exact text of one of the four options
- Difficulty must be "${difficulty.toLowerCase()}"
- Category must be "${category}"
- Questions must be factually accurate and directly related to the topic
- No duplicate questions
- No duplicate options within a question
- ${explanationInstruction}
- ${extraInstructions || "Keep the quiz focused on the requested topic."}
- Return only the JSON object, with no markdown or extra commentary`;

  let response;
  try {
    response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: buildQuizResponseSchema(),
        temperature: 0.7,
      },
    });
  } catch (err) {
    console.error('Gemini API error:', err.status || err.code || 'unknown', err.message);
    throw classifyGeminiError(err);
  }

  const rawContent = extractJsonText(response.text);
  if (!rawContent) {
    const emptyErr = new Error('Gemini returned an empty response');
    emptyErr.code = 'INVALID_AI_RESPONSE';
    throw emptyErr;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseErr) {
    console.error('Gemini JSON parse error:', parseErr.message);
    const invalidErr = new Error('Gemini returned invalid JSON');
    invalidErr.code = 'INVALID_AI_RESPONSE';
    throw invalidErr;
  }

  const validation = validateAIQuizPayload(parsed, numQuestions, difficulty, category);
  if (!validation.isValid) {
    console.error('Gemini response validation failed:', validation.errors.join('; '));
    const invalidErr = new Error('Gemini returned an invalid quiz structure. Please try again.');
    invalidErr.code = 'INVALID_AI_RESPONSE';
    throw invalidErr;
  }

  return mapToQuizDocument(parsed, { topic, category, difficulty, generateExplanations }, validation);
};

/**
 * Validates a quiz payload before saving (from client edit or save action).
 * Re-validates structure — never trusts client-provided scoring fields.
 */
const validateQuizForSave = (body) => {
  const errors = [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : 'General';
  const difficulty = body.difficulty;
  const questions = body.questions;

  if (!title) errors.push('Quiz title is required');
  if (!VALID_DIFFICULTIES.includes(difficulty)) errors.push('Invalid difficulty');
  if (!Array.isArray(questions) || questions.length < 1) errors.push('At least one question is required');

  if (Array.isArray(questions)) {
    questions.forEach((q, i) => {
      if (!q.question?.trim()) errors.push(`Question ${i + 1} text is required`);
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1} must have 4 options`);
      } else if (q.options.some((o) => !String(o).trim())) {
        errors.push(`Question ${i + 1} has empty options`);
      }
      const correct = Number(q.correctAnswer);
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
        errors.push(`Question ${i + 1} has invalid correct answer`);
      }
    });
  }

  if (errors.length > 0) return { isValid: false, errors };

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
  const sanitized = {
    title,
    description: body.description?.trim() || `AI-generated quiz: ${title}`,
    category,
    difficulty,
    questions: questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctAnswer: Number(q.correctAnswer),
      timeLimit: config.timeLimit,
      points: config.points,
      category,
      explanation: q.explanation ? String(q.explanation).trim() : '',
    })),
    generatedByAI: true,
    isPublic: body.isPublic !== false,
  };

  return { isValid: true, errors: [], data: sanitized };
};

module.exports = {
  VALID_DIFFICULTIES,
  VALID_QUESTION_COUNTS,
  validateGenerateRequest,
  validateAIQuizPayload,
  validateQuizForSave,
  generateQuizWithAI,
  mapToQuizDocument,
};
