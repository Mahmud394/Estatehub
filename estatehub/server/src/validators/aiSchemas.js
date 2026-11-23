const { z } = require('zod');

// The browser sends the message plus the filters from the previous answer (so "cheaper" can refine a search).
// The context is not trusted: it is cleaned again by sanitizeFilters() before it is used.
const chatBody = z.object({
  message: z.string().trim().min(1, 'Type a message first.').max(500, 'Please keep your message under 500 characters.'),
  context: z.record(z.any()).optional(),
}).strict();

module.exports = { chatBody };
