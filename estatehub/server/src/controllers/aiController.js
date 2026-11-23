const { ok } = require('../utils/response');
const ai = require('../services/aiService');

// POST /api/ai/chat   body: { message, context? }
async function chat(req, res, next) {
  try {
    const result = await ai.chat({ message: req.body.message, context: req.body.context });
    ok(res, result);
  } catch (err) { next(err); }
}

// GET /api/ai/status  -> { mode: 'llm' | 'rules' }  (never reveals keys or provider details)
function status(req, res) {
  ok(res, ai.status());
}

module.exports = { chat, status };
