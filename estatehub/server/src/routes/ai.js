const router = require('express').Router();
const c = require('../controllers/aiController');
const { validate } = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const { chatBody } = require('../validators/aiSchemas');

// Public on purpose: visitors can ask EstateAI too. It only reads approved listings, and it is rate limited
// because every message may cost money when an LLM key is configured.
router.get('/status', c.status);
router.post('/chat', aiLimiter, validate(chatBody), c.chat);

module.exports = router;
