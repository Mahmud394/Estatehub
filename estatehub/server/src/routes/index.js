const router = require('express').Router();

router.use('/health', require('./health'));
router.use('/auth', require('./auth'));
router.use('/properties', require('./properties'));
router.use('/brokers', require('./brokers'));
router.use('/public', require('./public')); // homepage stats and public reviews
router.use('/comments', require('./comments'));
router.use('/favorites', require('./favorites'));
router.use('/conversations', require('./conversations'));
router.use('/reviews', require('./reviews'));
router.use('/notifications', require('./notifications'));
router.use('/ai', require('./ai')); // EstateAI assistant (Phase 5)

// Phase 6 registers here:
// router.use('/admin', ...);

module.exports = router;
