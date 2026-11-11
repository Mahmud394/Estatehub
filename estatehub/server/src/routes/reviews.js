const router = require('express').Router();
const c = require('../controllers/reviewController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { reviewCreate, reviewUpdate } = require('../validators/interactionSchemas');

// Reviews are written by client accounts. Public reading is done through /brokers/:id.
router.use(requireAuth, requireRole('client'));

router.get('/eligibility/:brokerId(\\d+)', c.eligibility);
router.post('/', writeLimiter, validate(reviewCreate), c.create);
router.patch('/:id(\\d+)', writeLimiter, validate(reviewUpdate), c.update);
router.delete('/:id(\\d+)', c.remove);

module.exports = router;
