// Consistent JSON response shape: { success, data?, message?, errors? }
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, status, message, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

class AppError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

module.exports = { ok, fail, AppError };
