const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// Centralized error handler: never leaks stack traces or SQL details to the client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.status) return fail(res, err.status, err.message, err.errors);
  console.error('[error]', err);
  return fail(res, 500, 'Something went wrong on the server.');
}

module.exports = { notFound, errorHandler };
