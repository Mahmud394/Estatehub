const router = require('express').Router();
const { z } = require('zod');
const c = require('../controllers/brokerController');
const { validate } = require('../middleware/validate');

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  area: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

router.get('/', validate(listQuery, 'query'), c.list);
router.get('/:id(\\d+)', c.getOne);

module.exports = router;
