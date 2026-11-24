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

router.use('/reports', require('./reports')); // report content (Phase 6)
router.use('/admin', require('./admin')); // admin dashboard + moderation (Phase 6)

module.exports = router;
