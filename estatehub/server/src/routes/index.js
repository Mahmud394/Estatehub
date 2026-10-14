const router = require('express').Router();

router.use('/health', require('./health'));
router.use('/auth', require('./auth'));
router.use('/properties', require('./properties'));

// Later phases register here:
// router.use('/comments', ...); router.use('/conversations', ...); router.use('/admin', ...); router.use('/ai', ...);

module.exports = router;
