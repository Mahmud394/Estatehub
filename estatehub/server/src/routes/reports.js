const router = require('express').Router();
const c = require('../controllers/reportController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { reportCreate } = require('../validators/adminSchemas');

router.post('/', requireAuth, writeLimiter, validate(reportCreate), c.create);

module.exports = router;
