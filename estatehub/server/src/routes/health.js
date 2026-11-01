const router = require('express').Router();
const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');

// GET /api/health - confirms the API is up and MySQL is reachable
router.get('/', async (req, res) => {
  try {
    await query('SELECT 1');
    return ok(res, { api: 'up', database: 'up' }, 'EstateHub API is healthy');
  } catch (err) {
    console.error('[health] database check failed:', err.code || err.message);
    return fail(res, 503, 'API is running but the database is not reachable.');
  }
});

module.exports = router;
