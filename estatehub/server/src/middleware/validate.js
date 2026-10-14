const { AppError } = require('../utils/response');

// Validates req.body / req.query with a zod schema and replaces it with the cleaned result.
// Usage: router.post('/', validate(schema), handler)  or  validate(schema, 'query')
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join('.') || 'form'] = issue.message;
      }
      return next(new AppError(400, 'Please fix the highlighted fields.', errors));
    }
    // req.query is read-only in newer Express, so store validated query separately
    if (source === 'query') req.validQuery = result.data;
    else req[source] = result.data;
    next();
  };
}

module.exports = { validate };
