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

// Phase 5 and 6 register here:
// router.use('/ai', ...); router.use('/admin', ...);

module.exports = router;
