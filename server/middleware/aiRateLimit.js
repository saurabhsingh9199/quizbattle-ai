/**
 * Simple in-memory rate limiter for AI quiz generation.
 * Limits per authenticated user to prevent API abuse and control Gemini API usage.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX) || 10;

const requestLog = new Map();

const cleanupOldEntries = () => {
  const now = Date.now();
  for (const [key, timestamps] of requestLog.entries()) {
    const filtered = timestamps.filter((t) => now - t < WINDOW_MS);
    if (filtered.length === 0) requestLog.delete(key);
    else requestLog.set(key, filtered);
  }
};

// Periodic cleanup every 15 minutes
setInterval(cleanupOldEntries, 15 * 60 * 1000);

const aiGenerateRateLimit = (req, res, next) => {
  const userId = req.user?._id?.toString() || req.user?.id || req.ip;
  const now = Date.now();

  let timestamps = requestLog.get(userId) || [];
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    const retryMinutes = Math.ceil(retryAfterMs / 60000);
    return res.status(429).json({
      success: false,
      message: `AI generation limit reached. You can generate ${MAX_REQUESTS} quizzes per hour. Try again in ~${retryMinutes} minutes.`,
      code: 'APP_RATE_LIMIT',
    });
  }

  timestamps.push(now);
  requestLog.set(userId, timestamps);
  next();
};

module.exports = { aiGenerateRateLimit };
