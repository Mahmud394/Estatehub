const router = require('express').Router();
const c = require('../controllers/favoriteController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Favorites belong to client accounts.
router.use(requireAuth, requireRole('client'));

router.get('/', c.list);
router.get('/ids', c.ids);
router.post('/:propertyId(\\d+)', c.add);
router.delete('/:propertyId(\\d+)', c.remove);

module.exports = router;
