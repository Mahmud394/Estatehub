const router = require('express').Router();
const c = require('../controllers/commentController');
const { validate } = require('../middleware/validate');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { commentCreate, commentUpdate, commentListQuery, pageQuery } = require('../validators/interactionSchemas');

router.get('/', optionalAuth, validate(commentListQuery, 'query'), c.list);
router.get('/mine', requireAuth, requireRole('broker'), validate(pageQuery, 'query'), c.mine); // before "/:id"
router.post('/', requireAuth, writeLimiter, validate(commentCreate), c.create);
router.patch('/:id(\\d+)', requireAuth, writeLimiter, validate(commentUpdate), c.update);
router.delete('/:id(\\d+)', requireAuth, c.remove);

module.exports = router;
