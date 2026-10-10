const router = require('express').Router();

router.use('/health', require('./health'));

// Phase 2+ routes get registered here:
// router.use('/auth', require('./auth'));
// router.use('/properties', require('./properties'));

module.exports = router;
