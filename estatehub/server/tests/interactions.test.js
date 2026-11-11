// Integration tests for Phase 4: favorites, comments, private messages, reviews, notifications and email.
// Like the other test files, they use the real MySQL database from server/.env, create their own users
// with random emails, and delete everything they created at the end.
// Emails are NOT really sent: nodemailer is replaced by a recorder below.
// Run (MySQL running and `npm run db:init` done once):  npm test
process.env.NODE_ENV = 'test'; // disables rate limiting and must be set before the app is loaded
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// 1) Pretend SMTP is configured, and capture every email instead of sending it.
const env = require('../src/config/env');
env.smtp.host = 'smtp.test.local';
const nodemailer = require('nodemailer');
const sent = [];
let failEmails = false;
nodemailer.createTransport = () => ({
  sendMail: async (mail) => {
    if (failEmails) throw Object.assign(new Error('SMTP server unreachable'), { code: 'ECONNECTION' });
    sent.push(mail);
  },
});

const request = require('supertest');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');

const tag = Date.now();
const PASSWORD = 'Test12345';
const agents = {};
const ids = {};
const settle = () => new Promise((r) => setTimeout(r, 60)); // emails are sent after the response, so wait a moment
// emails are stored in lower case, so compare in lower case
const mailsTo = (name) => sent.filter((m) => m.to === `${name}${tag}@test.local`.toLowerCase());
const unreadNotifications = async (name, type) =>
  (await query('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND is_read = 0', [ids[name], type])).length;

async function signup(name, role) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    fullName: `${name} Tester`, email: `${name}${tag}@test.local`, password: PASSWORD, role,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  agents[name] = agent;
  ids[name] = res.body.data.user.id;
}

const listing = {
  title: 'Interaction test flat in Uttara',
  description: 'A listing created by the Phase 4 automated tests.',
  category: 'apartment', purpose: 'sale', price: 6000000, size: 1100,
  bedrooms: 3, bathrooms: 2, city: 'Dhaka', area: 'Uttara',
};
let publicId;   // approved listing owned by brokerA
let pendingId;  // unapproved listing owned by brokerA
let commentId;
let conversationId;

before(async () => {
  await signup('client1', 'client');
  await signup('client2', 'client');
  await signup('brokerA', 'broker');
  await signup('brokerB', 'broker');
  await signup('admin', 'client');
  await query("UPDATE users SET role = 'admin' WHERE id = ?", [ids.admin]);
  // Brokers must be verified by an admin before clients can message them.
  await query("UPDATE broker_profiles SET verification_status = 'approved' WHERE user_id IN (?, ?)", [ids.brokerA, ids.brokerB]);

  publicId = (await agents.brokerA.post('/api/properties').send(listing)).body.data.id;
  pendingId = (await agents.brokerA.post('/api/properties').send({ ...listing, title: 'Still waiting for approval' })).body.data.id;
  await query("UPDATE properties SET approval_status = 'approved' WHERE id = ?", [publicId]);
});

after(async () => {
  await query('DELETE FROM users WHERE email LIKE ?', [`%${tag}@test.local`]); // cascades to everything they own
  await pool.end();
});

// ───────────────────────────── favorites ─────────────────────────────
test('favorites: only logged-in clients can use them', async () => {
  assert.equal((await request(app).get('/api/favorites/ids')).status, 401);
  assert.equal((await agents.brokerA.get('/api/favorites/ids')).status, 403);
  assert.equal((await agents.brokerA.post(`/api/favorites/${publicId}`)).status, 403);
});

test('favorites: adding twice never creates a duplicate, and each user only sees their own', async () => {
  assert.equal((await agents.client1.post(`/api/favorites/${publicId}`)).status, 201);
  assert.equal((await agents.client1.post(`/api/favorites/${publicId}`)).status, 201);
  const rows = await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [ids.client1, publicId]);
  assert.equal(rows.length, 1);

  assert.deepEqual((await agents.client1.get('/api/favorites/ids')).body.data, [publicId]);
  assert.deepEqual((await agents.client2.get('/api/favorites/ids')).body.data, []);
  const list = await agents.client1.get('/api/favorites');
  assert.equal(list.body.data[0].id, publicId);
});

test('favorites: unapproved listings cannot be saved, and removal works', async () => {
  assert.equal((await agents.client1.post(`/api/favorites/${pendingId}`)).status, 404);
  assert.equal((await agents.client1.delete(`/api/favorites/${publicId}`)).status, 200);
  assert.deepEqual((await agents.client1.get('/api/favorites/ids')).body.data, []);
});

// ───────────────────────────── comments ─────────────────────────────
test('comments: anyone can read, only logged-in users can write', async () => {
  assert.equal((await request(app).get(`/api/comments?propertyId=${publicId}`)).status, 200);
  const anon = await request(app).post('/api/comments').send({ propertyId: publicId, body: 'hello' });
  assert.equal(anon.status, 401);
});

test('comments: validation, hidden listings and who may comment', async () => {
  assert.equal((await agents.client1.post('/api/comments').send({ propertyId: publicId, body: '   ' })).status, 400);
  assert.equal((await agents.client1.post('/api/comments').send({ propertyId: publicId, body: 'x'.repeat(1001) })).status, 400);
  assert.equal((await agents.client1.post('/api/comments').send({ propertyId: pendingId, body: 'Is this available?' })).status, 404);
  assert.equal((await request(app).get(`/api/comments?propertyId=${pendingId}`)).status, 404);
  // another broker cannot comment on someone else's listing
  assert.equal((await agents.brokerB.post('/api/comments').send({ propertyId: publicId, body: 'Buy from me instead' })).status, 403);
});

test('comments: posting saves it, shows a privacy-safe name, and notifies the broker once', async () => {
  sent.length = 0;
  const res = await agents.client1.post('/api/comments').send({ propertyId: publicId, body: 'Is parking included?' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  commentId = res.body.data.id;
  assert.equal(res.body.data.author.name, 'client1 T.');     // "First L." only
  assert.ok(!JSON.stringify(res.body).includes('@test.local')); // no email address in the response
  assert.equal(res.body.data.canEdit, true);

  const stored = await query('SELECT body FROM comments WHERE id = ?', [commentId]);
  assert.equal(stored[0].body, 'Is parking included?');

  assert.equal(await unreadNotifications('brokerA', 'new_comment'), 1);
  await settle();
  const mails = mailsTo('brokerA');
  assert.equal(mails.length, 1);
  assert.ok(mails[0].text.includes(listing.title));
  assert.ok(mails[0].text.includes('/broker/comments'));
  assert.ok(!mails[0].text.includes('Is parking included?'), 'email must not contain the comment text');
  assert.ok(!mails[0].html.includes('Is parking included?'));
});

test('comments: a double-click does not create a duplicate or a second email', async () => {
  sent.length = 0;
  const again = await agents.client1.post('/api/comments').send({ propertyId: publicId, body: 'Is parking included?' });
  assert.equal(again.status, 409);
  await settle();
  assert.equal(sent.length, 0);
});

test('comments: only the author can edit; author or admin can delete', async () => {
  assert.equal((await agents.client2.patch(`/api/comments/${commentId}`).send({ body: 'hacked' })).status, 403);
  assert.equal((await agents.brokerA.patch(`/api/comments/${commentId}`).send({ body: 'hacked' })).status, 403);
  const edit = await agents.client1.patch(`/api/comments/${commentId}`).send({ body: 'Is parking included in the price?' });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.data.body, 'Is parking included in the price?');

  assert.equal((await agents.client2.delete(`/api/comments/${commentId}`)).status, 403);

  const second = await agents.client2.post('/api/comments').send({ propertyId: publicId, body: 'Can I visit on Friday?' });
  const del = await agents.admin.delete(`/api/comments/${second.body.data.id}`);
  assert.equal(del.status, 200);
  const audit = await query("SELECT id FROM audit_logs WHERE action = 'delete_comment' AND target_id = ?", [second.body.data.id]);
  assert.equal(audit.length, 1);
});

test("comments: the listing's broker can reply (no self-notification) and sees comments on their dashboard", async () => {
  sent.length = 0;
  const before = await unreadNotifications('brokerA', 'new_comment');
  const reply = await agents.brokerA.post('/api/comments').send({ propertyId: publicId, body: 'Yes, one parking spot is included.' });
  assert.equal(reply.status, 201);
  assert.equal(reply.body.data.author.role, 'broker');
  await settle();
  assert.equal(sent.length, 0);

  assert.equal((await agents.client1.get('/api/comments/mine')).status, 403);
  assert.equal((await agents.brokerB.get('/api/comments/mine')).body.data.items.length, 0); // not their listings
  const mine = await agents.brokerA.get('/api/comments/mine');
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.items.length >= 2);
  assert.equal(mine.body.data.items[0].propertyTitle, listing.title);
  assert.ok(before >= 1);
  assert.equal(await unreadNotifications('brokerA', 'new_comment'), 0); // opening the page clears the bell
});

// ───────────────────────────── private messages ─────────────────────────────
test('messages: login required, and only clients can start a conversation', async () => {
  assert.equal((await request(app).get('/api/conversations')).status, 401);
  const asBroker = await agents.brokerB.post('/api/conversations').send({ propertyId: publicId, body: 'Hi' });
  assert.equal(asBroker.status, 403);
  assert.equal((await agents.client1.post('/api/conversations').send({ propertyId: pendingId, body: 'Hi' })).status, 404);
  assert.equal((await agents.client1.post('/api/conversations').send({ body: 'Hi' })).status, 400); // no target
  assert.equal((await agents.client1.post('/api/conversations').send({ propertyId: publicId, body: '' })).status, 400);
});

test('messages: first message creates the conversation and emails the broker (without the message text)', async () => {
  sent.length = 0;
  const res = await agents.client1.post('/api/conversations').send({ propertyId: publicId, body: 'Hello, is the flat still available?' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  conversationId = res.body.data.conversationId;

  await settle();
  const mails = mailsTo('brokerA');
  assert.equal(mails.length, 1);
  assert.ok(mails[0].text.includes(listing.title));
  assert.ok(mails[0].text.includes(`/broker/messages/${conversationId}`));
  assert.ok(!mails[0].text.includes('still available'), 'email must not contain the message text');
  assert.ok(!mails[0].text.toLowerCase().includes(`client1${tag}@test.local`), 'email must not leak the client email');
  assert.equal(await unreadNotifications('brokerA', 'new_message'), 1);
});

test('messages: more messages in a row do not create more emails or bell entries', async () => {
  sent.length = 0;
  const again = await agents.client1.post('/api/conversations').send({ propertyId: publicId, body: 'Also, what floor is it on?' });
  assert.equal(again.body.data.conversationId, conversationId); // same conversation is reused
  const reply = await agents.client1.post(`/api/conversations/${conversationId}/messages`).send({ body: 'Any news?' });
  assert.equal(reply.status, 201);
  await settle();
  assert.equal(sent.length, 0);
  assert.equal(await unreadNotifications('brokerA', 'new_message'), 1);
  const convRows = await query('SELECT id FROM conversations WHERE client_id = ? AND broker_id = ?', [ids.client1, ids.brokerA]);
  assert.equal(convRows.length, 1);
});

test('messages: strangers get 404, admins can read only (and it is logged), nobody else can write', async () => {
  assert.equal((await agents.client2.get(`/api/conversations/${conversationId}`)).status, 404);
  assert.equal((await agents.brokerB.get(`/api/conversations/${conversationId}`)).status, 404);
  assert.equal((await agents.client2.post(`/api/conversations/${conversationId}/messages`).send({ body: 'spy' })).status, 404);
  assert.equal((await agents.client2.post(`/api/conversations/${conversationId}/read`)).status, 404);
  assert.deepEqual((await agents.client2.get('/api/conversations')).body.data.items, []);

  const adminView = await agents.admin.get(`/api/conversations/${conversationId}`);
  assert.equal(adminView.status, 200);
  assert.equal(adminView.body.data.conversation.readOnly, true);
  assert.equal(adminView.body.data.messages.length, 3);
  const audit = await query("SELECT id FROM audit_logs WHERE action = 'view_conversation' AND target_id = ?", [conversationId]);
  assert.equal(audit.length, 1);
  assert.equal((await agents.admin.post(`/api/conversations/${conversationId}/messages`).send({ body: 'hello' })).status, 403);
});

test("messages: each side's list shows the right person, preview and unread count", async () => {
  const brokerList = (await agents.brokerA.get('/api/conversations')).body.data;
  assert.equal(brokerList.items.length, 1);
  assert.equal(brokerList.items[0].other.name, 'client1 T.');
  assert.equal(brokerList.items[0].unreadCount, 3);
  assert.equal(brokerList.unreadTotal, 3);
  assert.equal(brokerList.items[0].property.title, listing.title);
  assert.ok(!JSON.stringify(brokerList).includes('@test.local'));

  const clientList = (await agents.client1.get('/api/conversations')).body.data;
  assert.equal(clientList.items[0].other.name, `brokerA Tester`);
  assert.equal(clientList.items[0].unreadCount, 0);
});

test('messages: opening the thread marks messages read and clears the bell; the sender sees "read"', async () => {
  const thread = await agents.brokerA.get(`/api/conversations/${conversationId}`);
  assert.equal(thread.body.data.messages.length, 3);
  assert.equal(thread.body.data.messages[0].mine, false);

  assert.equal((await agents.brokerA.post(`/api/conversations/${conversationId}/read`)).body.data.marked, 3);
  assert.equal(await unreadNotifications('brokerA', 'new_message'), 0);

  const clientThread = await agents.client1.get(`/api/conversations/${conversationId}`);
  assert.ok(clientThread.body.data.messages.every((m) => m.mine && m.isRead));
  // the client's own messages are never "read" by the client
  assert.equal((await agents.client1.post(`/api/conversations/${conversationId}/read`)).body.data.marked, 0);
});

test('messages: broker reply notifies the client in-app only; a new client message after reading emails again', async () => {
  sent.length = 0;
  const reply = await agents.brokerA.post(`/api/conversations/${conversationId}/messages`).send({ body: 'Yes, it is available.' });
  assert.equal(reply.status, 201);
  await settle();
  assert.equal(mailsTo('client1').length, 0);
  assert.equal(await unreadNotifications('client1', 'new_message'), 1);

  await agents.client1.post(`/api/conversations/${conversationId}/messages`).send({ body: 'Great, can I visit tomorrow?' });
  await settle();
  assert.equal(mailsTo('brokerA').length, 1); // broker had read everything, so this is a "new" unread message
});

test('messages: a failing SMTP server never breaks sending', async () => {
  failEmails = true;
  await agents.brokerA.post(`/api/conversations/${conversationId}/read`);
  const res = await agents.client1.post(`/api/conversations/${conversationId}/messages`).send({ body: 'This message must still be saved.' });
  failEmails = false;
  assert.equal(res.status, 201);
  const saved = await query('SELECT id FROM messages WHERE conversation_id = ? AND body = ?', [conversationId, 'This message must still be saved.']);
  assert.equal(saved.length, 1);
});

test('messages: contacting a broker directly, unverified brokers and suspended accounts', async () => {
  const direct = await agents.client2.post('/api/conversations').send({ brokerId: ids.brokerB, body: 'Do you have land in Mirpur?' });
  assert.equal(direct.status, 201);
  assert.notEqual(direct.body.data.conversationId, conversationId);
  const same = await agents.client2.post('/api/conversations').send({ brokerId: ids.brokerB, body: 'Hello?' });
  assert.equal(same.body.data.conversationId, direct.body.data.conversationId); // property-less conversation is reused too

  await query("UPDATE broker_profiles SET verification_status = 'pending' WHERE user_id = ?", [ids.brokerB]);
  assert.equal((await agents.client1.post('/api/conversations').send({ brokerId: ids.brokerB, body: 'Hi' })).status, 404);
  await query("UPDATE broker_profiles SET verification_status = 'approved' WHERE user_id = ?", [ids.brokerB]);

  await query("UPDATE users SET status = 'suspended' WHERE id = ?", [ids.brokerA]);
  const toSuspended = await agents.client1.post(`/api/conversations/${conversationId}/messages`).send({ body: 'hello?' });
  assert.equal(toSuspended.status, 403);
  await query("UPDATE users SET status = 'active' WHERE id = ?", [ids.brokerA]);
});

// ───────────────────────────── reviews ─────────────────────────────
test('reviews: only clients who contacted the broker are eligible', async () => {
  assert.equal((await request(app).get(`/api/reviews/eligibility/${ids.brokerA}`)).status, 401);
  assert.equal((await agents.brokerB.get(`/api/reviews/eligibility/${ids.brokerA}`)).status, 403);

  const stranger = await agents.client2.get(`/api/reviews/eligibility/${ids.brokerA}`);
  assert.equal(stranger.body.data.eligible, false);
  const blocked = await agents.client2.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 5, body: 'Never spoke to them' });
  assert.equal(blocked.status, 403);

  const contacted = await agents.client1.get(`/api/reviews/eligibility/${ids.brokerA}`);
  assert.equal(contacted.body.data.eligible, true);
  assert.equal(contacted.body.data.review, null);
});

test('reviews: validation, one review per broker, edit and delete own only', async () => {
  assert.equal((await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 6, body: 'Great' })).status, 400);
  assert.equal((await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 4, body: '' })).status, 400);

  const created = await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 4, body: 'Quick and helpful.' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const reviewId = created.body.data.id;
  assert.equal((await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 5, body: 'Great service, once again.' })).status, 409);

  assert.equal((await agents.client2.patch(`/api/reviews/${reviewId}`).send({ rating: 1 })).status, 403);
  assert.equal((await agents.client2.delete(`/api/reviews/${reviewId}`)).status, 403);

  const edit = await agents.client1.patch(`/api/reviews/${reviewId}`).send({ rating: 5 });
  assert.equal(edit.body.data.rating, 5);

  // public broker profile shows the real review with a shortened client name and the computed rating
  const profile = await request(app).get(`/api/brokers/${ids.brokerA}`);
  assert.equal(profile.status, 200);
  const mine = profile.body.data.reviews.find((r) => r.id === reviewId);
  assert.equal(mine.clientName, 'client1 T.');
  assert.equal(mine.isDemo, false);
  assert.equal(profile.body.data.averageRating, 5);
  assert.ok(!JSON.stringify(profile.body).includes('@test.local'));

  assert.equal((await agents.client1.delete(`/api/reviews/${reviewId}`)).status, 200);
  assert.equal((await request(app).get(`/api/brokers/${ids.brokerA}`)).body.data.reviews.length, 0);
});

// ───────────────────────────── notifications ─────────────────────────────
test('notifications: users only ever see and change their own', async () => {
  assert.equal((await request(app).get('/api/notifications')).status, 401);
  const mine = await agents.client1.get('/api/notifications');
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.unreadCount >= 1);
  const otherId = mine.body.data.items[0].id;

  // brokerB cannot touch client1's notification
  assert.equal((await agents.brokerB.post(`/api/notifications/${otherId}/read`)).status, 404);
  assert.ok(!(await agents.brokerB.get('/api/notifications')).body.data.items.some((n) => n.id === otherId));

  assert.equal((await agents.client1.post(`/api/notifications/${otherId}/read`)).status, 200);
  await agents.client1.post('/api/notifications/read-all');
  assert.equal((await agents.client1.get('/api/notifications')).body.data.unreadCount, 0);
});

// ───────────────────────────── ratings and public reviews (Phase 4 additions) ─────────────────────────────
test('ratings: a review needs at least 10 characters', async () => {
  const short = await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 5, body: 'Too short' });
  assert.equal(short.status, 400);
  assert.ok(short.body.errors.body, 'the error is attached to the "body" field');
});

test('ratings: average, star breakdown and the paginated public list come from real rows', async () => {
  // client2 has to contact brokerA before they are allowed to review them
  await agents.client2.post('/api/conversations').send({ brokerId: ids.brokerA, body: 'Hello, do you list flats in Uttara?' });
  const r1 = await agents.client1.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 5, body: 'Excellent service from start to finish.' });
  const r2 = await agents.client2.post('/api/reviews').send({ brokerId: ids.brokerA, rating: 2, body: 'Slow to reply and the pricing was unclear.' });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.equal(r2.status, 201, JSON.stringify(r2.body));

  const pub = await request(app).get(`/api/brokers/${ids.brokerA}/reviews`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.summary.count, 2);
  assert.equal(pub.body.data.summary.average, 3.5);
  assert.deepEqual(pub.body.data.summary.breakdown, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 });
  assert.equal(pub.body.data.items.length, 2);
  assert.ok(!JSON.stringify(pub.body).includes('@test.local'));

  const page2 = await request(app).get(`/api/brokers/${ids.brokerA}/reviews?limit=1&page=2`);
  assert.equal(page2.body.data.items.length, 1);
  assert.equal(page2.body.data.pagination.totalPages, 2);

  const profile = await request(app).get(`/api/brokers/${ids.brokerA}`);
  assert.deepEqual(profile.body.data.ratingBreakdown, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 });
  assert.equal(profile.body.data.averageRating, 3.5);
  assert.equal(profile.body.data.reviewCount, 2);

  // the broker gets an in-app notification per review, and it does not contain the review text
  const notes = await query("SELECT title FROM notifications WHERE user_id = ? AND type = 'new_review' ORDER BY id", [ids.brokerA]);
  assert.equal(notes.length, 2);
  assert.ok(notes.every((n) => !n.title.includes('Excellent') && !n.title.includes('Slow')));
});

test('ratings: a moderator-hidden review leaves the average and cannot be edited, only deleted', async () => {
  const [mine] = await query('SELECT id FROM reviews WHERE broker_id = ? AND client_id = ?', [ids.brokerA, ids.client2]);
  await query("UPDATE reviews SET status = 'hidden' WHERE id = ?", [mine.id]);

  const pub = await request(app).get(`/api/brokers/${ids.brokerA}/reviews`);
  assert.equal(pub.body.data.summary.count, 1);
  assert.equal(pub.body.data.summary.average, 5);

  assert.equal((await agents.client2.patch(`/api/reviews/${mine.id}`).send({ rating: 5 })).status, 403);
  assert.equal((await agents.client2.delete(`/api/reviews/${mine.id}`)).status, 200);
});

test('ratings: unverified brokers have no public review page', async () => {
  await query("UPDATE broker_profiles SET verification_status = 'pending' WHERE user_id = ?", [ids.brokerB]);
  assert.equal((await request(app).get(`/api/brokers/${ids.brokerB}/reviews`)).status, 404);
  await query("UPDATE broker_profiles SET verification_status = 'approved' WHERE user_id = ?", [ids.brokerB]);
  assert.equal((await request(app).get(`/api/brokers/${ids.brokerB}/reviews`)).status, 200);
});

test('comments: a moderator-hidden comment disappears from the list and cannot be edited', async () => {
  const made = await agents.client2.post('/api/comments').send({ propertyId: publicId, body: 'This comment will be hidden.' });
  assert.equal(made.status, 201);
  await query("UPDATE comments SET status = 'hidden' WHERE id = ?", [made.body.data.id]);

  const list = await request(app).get(`/api/comments?propertyId=${publicId}&limit=50`);
  assert.ok(!list.body.data.items.some((c) => c.id === made.body.data.id));
  assert.equal((await agents.client2.patch(`/api/comments/${made.body.data.id}`).send({ body: 'edited' })).status, 403);
});
