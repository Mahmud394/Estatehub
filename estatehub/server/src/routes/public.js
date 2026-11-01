const router = require('express').Router();
const c = require('../controllers/publicController');

router.get('/stats', c.stats);
router.get('/reviews/recent', c.recentReviews);

module.exports = router;
