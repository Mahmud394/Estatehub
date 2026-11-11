const { query } = require('../config/db');

// Creates an in-app notification. With dedupe = true, nothing is added if the user already has
// an UNREAD notification of the same type pointing at the same page (so 5 chat messages in a row
// produce one bell entry, not five). Returns true if a new notification was created.
async function create(userId, type, title, link, { dedupe = false } = {}) {
  if (dedupe) {
    const existing = await query(
      'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND link = ? AND is_read = 0 LIMIT 1',
      [userId, type, link]
    );
    if (existing.length) return false;
  }
  await query('INSERT INTO notifications (user_id, type, title, link) VALUES (?,?,?,?)', [
    userId, type, String(title).slice(0, 160), link,
  ]);
  return true;
}

// Notifications are a convenience. If one fails, the main action (comment, message...) must still succeed.
async function createSafely(...args) {
  try {
    return await create(...args);
  } catch (err) {
    console.error('[notifications] could not create notification:', err.code || err.message);
    return false;
  }
}

module.exports = { create, createSafely };
