const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// The automated tests send many requests from one IP, so limits are skipped when NODE_ENV=test.
const skip = () => env.nodeEnv === 'test';

// Slows down password guessing on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.', errors: null },
});

// Slows down spam on comments, messages and other user-written content (30 writes per minute per IP).
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'You are doing that too quickly. Please wait a moment.', errors: null },
});

module.exports = { authLimiter, writeLimiter };
