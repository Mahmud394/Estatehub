const router = require('express').Router();
const c = require('../controllers/conversationController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { conversationCreate, messageCreate } = require('../validators/interactionSchemas');

router.use(requireAuth);

router.get('/', requireRole('client', 'broker'), c.list);
router.post('/', requireRole('client'), writeLimiter, validate(conversationCreate), c.create); // only clients start conversations
router.get('/:id(\\d+)', c.getOne); // participants, or admins (read-only, logged)
router.post('/:id(\\d+)/messages', requireRole('client', 'broker'), writeLimiter, validate(messageCreate), c.sendMessage);
router.post('/:id(\\d+)/read', c.markRead);

module.exports = router;
