const { query } = require('../config/db');

// Every important admin action is written here so there is always a record of who did what.
async function log(adminId, action, targetType, targetId, details = null) {
  await query(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [adminId, action, targetType, targetId, details ? String(details).slice(0, 500) : null]
  );
}

module.exports = { log };
