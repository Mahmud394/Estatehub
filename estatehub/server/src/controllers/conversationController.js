const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { publicName } = require('../utils/names');
const { createSafely } = require('../services/notificationService');
const { notifyByEmail } = require('../services/mailService');

// Where each side opens a conversation in the React app.
const linkFor = (role, conversationId) => (role === 'broker' ? `/broker/messages/${conversationId}` : `/messages/${conversationId}`);

const isParticipant = (conv, userId) => conv.client_id === userId || conv.broker_id === userId;

async function loadConversation(id) {
  const [conv] = await query(
    `SELECT c.id, c.property_id, c.client_id, c.broker_id, p.title AS property_title,
            cu.full_name AS client_name, cu.avatar_url AS client_avatar, cu.status AS client_status,
            bu.full_name AS broker_name, bu.avatar_url AS broker_avatar, bu.status AS broker_status, bu.email AS broker_email
     FROM conversations c
     LEFT JOIN properties p ON p.id = c.property_id
     JOIN users cu ON cu.id = c.client_id
     JOIN users bu ON bu.id = c.broker_id
     WHERE c.id = ?`,
    [id]
  );
  return conv || null;
}

// The "other person" as seen by `viewer`.
function otherParty(conv, viewerId) {
  const viewerIsClient = conv.client_id === viewerId;
  return viewerIsClient
    ? { id: conv.broker_id, name: conv.broker_name, avatarUrl: conv.broker_avatar, role: 'broker' }
    : { id: conv.client_id, name: publicName(conv.client_name, 'client'), avatarUrl: conv.client_avatar, role: 'client' };
}

// Participants only. Admins may open a conversation read-only (and every such view is logged).
async function authorize(req, convId) {
  const conv = await loadConversation(convId);
  // Strangers get 404, not 403, so the existence of a conversation is not revealed.
  if (!conv) throw new AppError(404, 'Conversation not found.');
  if (isParticipant(conv, req.user.id)) return { conv, readOnly: false };
  if (req.user.role === 'admin') return { conv, readOnly: true };
  throw new AppError(404, 'Conversation not found.');
}

// ---------------------------------------------------------------------------
async function list(req, res, next) {
  try {
    const uid = req.user.id;
    const rows = await query(
      `SELECT c.id, c.property_id, c.client_id, c.broker_id, c.updated_at,
              p.title AS property_title,
              cu.full_name AS client_name, cu.avatar_url AS client_avatar,
              bu.full_name AS broker_name, bu.avatar_url AS broker_avatar,
              (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_at,
              (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = 0) AS unread
       FROM conversations c
       LEFT JOIN properties p ON p.id = c.property_id
       JOIN users cu ON cu.id = c.client_id
       JOIN users bu ON bu.id = c.broker_id
       WHERE c.client_id = ? OR c.broker_id = ?
       ORDER BY c.updated_at DESC, c.id DESC LIMIT 100`,
      [uid, uid, uid]
    );
    const items = rows.map((r) => ({
      id: r.id,
      property: r.property_id ? { id: r.property_id, title: r.property_title } : null,
      other: otherParty(r, uid),
      lastMessage: r.last_body === null ? null : {
        body: r.last_body.length > 120 ? `${r.last_body.slice(0, 117)}...` : r.last_body,
        createdAt: r.last_at,
        mine: r.last_sender === uid,
      },
      unreadCount: Number(r.unread),
      updatedAt: r.updated_at,
    }));
    return ok(res, { items, unreadTotal: items.reduce((n, c) => n + c.unreadCount, 0) });
  } catch (err) { next(err); }
}

// Starts (or reuses) a conversation and sends the first message. Clients only.
async function create(req, res, next) {
  try {
    const { propertyId, brokerId, body } = req.body;
    let toBroker;
    let linkedPropertyId = null;

    if (propertyId) {
      const [p] = await query(
        "SELECT id, broker_id FROM properties WHERE id = ? AND approval_status = 'approved' AND availability_status <> 'unavailable'",
        [propertyId]
      );
      if (!p) throw new AppError(404, 'Property not found.');
      toBroker = p.broker_id;
      linkedPropertyId = p.id;
    } else {
      toBroker = brokerId;
    }

    // Only active, verified brokers can be contacted.
    const [broker] = await query(
      `SELECT u.id FROM users u JOIN broker_profiles bp ON bp.user_id = u.id
       WHERE u.id = ? AND u.role = 'broker' AND u.status = 'active' AND bp.verification_status = 'approved'`,
      [toBroker]
    );
    if (!broker) throw new AppError(404, 'This broker is not available for messages.');

    // `<=>` is MySQL's NULL-safe equals, so "no property" matches "no property".
    const find = () => query(
      'SELECT id FROM conversations WHERE client_id = ? AND broker_id = ? AND property_id <=> ? LIMIT 1',
      [req.user.id, toBroker, linkedPropertyId]
    );
    let [existing] = await find();
    if (!existing) {
      try {
        const r = await query('INSERT INTO conversations (property_id, client_id, broker_id) VALUES (?,?,?)',
          [linkedPropertyId, req.user.id, toBroker]);
        existing = { id: r.insertId };
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err; // two requests raced: use the one that won
        [existing] = await find();
      }
    }

    const conv = await loadConversation(existing.id);
    const message = await addMessage(conv, req.user, body);
    return ok(res, { conversationId: conv.id, message }, 'Message sent.', 201);
  } catch (err) { next(err); }
}

// Inserts a message and handles notifications. Used by both "start conversation" and "reply".
async function addMessage(conv, sender, body) {
  const recipientIsBroker = sender.id === conv.client_id;
  const recipientId = recipientIsBroker ? conv.broker_id : conv.client_id;
  const recipientStatus = recipientIsBroker ? conv.broker_status : conv.client_status;
  if (recipientStatus !== 'active') throw new AppError(403, "This person's account is not available for messages.");

  // Duplicate-notification rule: only the FIRST unread message since the recipient last looked
  // creates a bell entry and an email. Later messages just appear in the thread.
  const [{ pending }] = await query(
    'SELECT COUNT(*) AS pending FROM messages WHERE conversation_id = ? AND sender_id = ? AND is_read = 0',
    [conv.id, sender.id]
  );

  const r = await query('INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)', [conv.id, sender.id, body]);
  await query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conv.id]);

  if (Number(pending) === 0) {
    const about = conv.property_title ? ` about "${conv.property_title}"` : '';
    const created = await createSafely(
      recipientId, 'new_message', `New message${about}`,
      linkFor(recipientIsBroker ? 'broker' : 'client', conv.id), { dedupe: true }
    );
    // Email only the broker, and only when a new bell entry was really created.
    if (recipientIsBroker && created) {
      notifyByEmail(conv.broker_email, 'New message on EstateHub', {
        headline: 'A client sent you a new message.',
        propertyTitle: conv.property_title,
        path: linkFor('broker', conv.id),
        linkLabel: 'Open your messages',
      });
    }
  }
  const [msg] = await query('SELECT id, sender_id, body, is_read, created_at FROM messages WHERE id = ?', [r.insertId]);
  return messageDto(msg, sender.id);
}

const messageDto = (m, viewerId) => ({
  id: m.id,
  body: m.body,
  mine: m.sender_id === viewerId,
  senderId: m.sender_id,
  isRead: !!m.is_read,
  createdAt: m.created_at,
});

// Conversation details + the latest 200 messages (the React page re-fetches this every few seconds).
async function getOne(req, res, next) {
  try {
    const { conv, readOnly } = await authorize(req, Number(req.params.id));
    if (readOnly) {
      await query('INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
        [req.user.id, 'view_conversation', 'conversation', conv.id, 'Admin opened a private conversation (read-only).']);
    }
    const msgs = await query(
      `SELECT id, sender_id, body, is_read, created_at FROM (
         SELECT id, sender_id, body, is_read, created_at FROM messages WHERE conversation_id = ?
         ORDER BY id DESC LIMIT 200
       ) t ORDER BY id ASC`,
      [conv.id]
    );
    return ok(res, {
      conversation: {
        id: conv.id,
        property: conv.property_id ? { id: conv.property_id, title: conv.property_title } : null,
        other: readOnly ? null : otherParty(conv, req.user.id),
        participants: readOnly
          ? { client: publicName(conv.client_name, 'client'), broker: conv.broker_name }
          : undefined,
        readOnly,
      },
      messages: msgs.map((m) => messageDto(m, req.user.id)),
    });
  } catch (err) { next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const { conv, readOnly } = await authorize(req, Number(req.params.id));
    if (readOnly) throw new AppError(403, 'Administrators cannot send messages in private conversations.');
    const message = await addMessage(conv, req.user, req.body.body);
    return ok(res, message, 'Message sent.', 201);
  } catch (err) { next(err); }
}

// The viewer has opened the thread: mark the other person's messages as read and clear the bell entry.
async function markRead(req, res, next) {
  try {
    const { conv, readOnly } = await authorize(req, Number(req.params.id));
    if (readOnly) return ok(res, { marked: 0 });
    const r = await query('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id <> ? AND is_read = 0', [conv.id, req.user.id]);
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND link = ?', [req.user.id, linkFor(req.user.role, conv.id)]);
    return ok(res, { marked: r.affectedRows });
  } catch (err) { next(err); }
}

module.exports = { list, create, getOne, sendMessage, markRead };
