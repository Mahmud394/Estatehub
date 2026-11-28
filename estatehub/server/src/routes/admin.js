const router = require('express').Router();
const c = require('../controllers/adminController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validators/adminSchemas');

// Every admin route needs a logged-in ACTIVE admin. This is the real permission check (the UI only hides links).
router.use(requireAuth, requireRole('admin'));

router.get('/stats', c.stats);
router.post('/mail/test', c.sendTestMail);

router.get('/properties', validate(s.adminPropertyQuery, 'query'), c.listProperties);
router.post('/properties/:id(\\d+)/approve', c.approveProperty);
router.post('/properties/:id(\\d+)/reject', validate(s.rejectBody), c.rejectProperty);

router.get('/brokers', validate(s.adminBrokerQuery, 'query'), c.listBrokers);
router.post('/brokers/:id(\\d+)/verify', c.verifyBroker);
router.post('/brokers/:id(\\d+)/reject', validate(s.brokerRejectBody), c.rejectBroker);

router.get('/users', validate(s.adminUserQuery, 'query'), c.listUsers);
router.patch('/users/:id(\\d+)/status', validate(s.userStatusBody), c.setUserStatus);

router.get('/comments', validate(s.adminCommentQuery, 'query'), c.listComments);
router.patch('/comments/:id(\\d+)/status', validate(s.moderationBody), c.moderateComment);
router.get('/reviews', validate(s.adminReviewQuery, 'query'), c.listReviews);
router.patch('/reviews/:id(\\d+)/status', validate(s.moderationBody), c.moderateReview);

router.get('/reports', validate(s.adminReportQuery, 'query'), c.listReports);
router.patch('/reports/:id(\\d+)', validate(s.reportResolveBody), c.resolveReport);

router.get('/audit-logs', validate(s.auditQuery, 'query'), c.listAudit);

module.exports = router;
