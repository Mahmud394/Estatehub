const router = require('express').Router();
const c = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema, profileSchema } = require('../validators/authSchemas');

router.post('/register', authLimiter, validate(registerSchema), c.register);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);
router.patch('/me', requireAuth, validate(profileSchema), c.updateProfile);

module.exports = router;
