const router = require('express').Router();
const c = require('../controllers/notificationController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { notificationQuery } = require('../validators/interactionSchemas');

router.use(requireAuth);

router.get('/', validate(notificationQuery, 'query'), c.list);
router.post('/read-all', c.markAllRead);
router.post('/:id(\\d+)/read', c.markRead);

module.exports = router;
