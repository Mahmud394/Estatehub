// Vercel entry point: every request to /api/* is rewritten here (see vercel.json) and handled by the same Express app
// you run locally with `npm run dev`. Nothing is duplicated.
module.exports = require('../server/src/app');
