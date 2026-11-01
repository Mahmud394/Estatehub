const router = require('express').Router();

router.use('/health', require('./health'));
router.use('/auth', require('./auth'));
router.use('/properties', require('./properties'));
<<<<<<< HEAD
router.use('/brokers', require('./brokers'));
router.use('/public', require('./public')); // homepage stats and public reviews
=======
>>>>>>> origin/main

// Later phases register here:
// router.use('/comments', ...); router.use('/conversations', ...); router.use('/admin', ...); router.use('/ai', ...);

module.exports = router;
