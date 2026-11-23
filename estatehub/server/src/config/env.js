// Loads .env and exposes validated settings in one place.
require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'estatehub',
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Email notifications. If SMTP_HOST is empty, emails are skipped (in-app notifications still work).
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'EstateHub <no-reply@estatehub.local>',
  },
  // EstateAI. With no LLM_API_KEY the assistant uses its built-in rule-based mode (free, offline).
  // LLM_PROVIDER: 'anthropic' (default) or 'openai' (any OpenAI-compatible API).
  llm: (() => {
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase() === 'openai' ? 'openai' : 'anthropic';
    return {
      apiKey: process.env.LLM_API_KEY || '',
      provider,
      model: process.env.LLM_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-5-5'),
      baseUrl: process.env.LLM_BASE_URL || (provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com'),
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 8000,
    };
  })(),
};

if (!env.jwtSecret || env.jwtSecret.startsWith('change_me')) {
  console.warn('[env] JWT_SECRET is missing or still the default. Set a real secret in server/.env');
}

module.exports = env;
