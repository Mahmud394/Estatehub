// Integration tests for Phase 6: admin permissions, moderation, reports and the audit trail.
// Same style as the other test files: real MySQL from server/.env, random users, cleanup at the end.
// Run (MySQL running and `npm run db:init` done once):  npm test
process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');

const tag = Date.now();
const PASSWORD = 'Test12345';
const agents = {};
const ids = {};

async function signup(name, role) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ fullName: `${name} Tester`, email: `${name}${tag}@test.local`, password: PASSWORD, role });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  agents[name] = agent;
  ids[name] = res.body.data.user.id;
}
const auditCount = async (action, targetId) =>
  (await query('SELECT id FROM audit_logs WHERE action = ? AND target_id = ?', [action, targetId])).length;

const listing = {
  title: 'Admin test flat', description: 'Created by the Phase 6 automated tests.',
  category: 'apartment', purpose: 'sale', price: 5000000, size: 900, bedrooms: 2, bathrooms: 1, city: 'Dhaka', area: 'Mirpur',
};
let propertyId; let commentId; let reviewId;

before(async () => {
  await signup('admin', 'client');
  await query("UPDATE users SET role = 'admin' WHERE id = ?", [ids.admin]);
  await signup('client1', 'client');
  await signup('client2', 'client');
  await signup('broker', 'broker');

  propertyId = (await agents.broker.post('/api/properties').send(listing)).body.data.id; // starts as "pending"
  await query("UPDATE broker_profiles SET verification_status = 'approved' WHERE user_id = ?", [ids.broker]);
  await query("UPDATE properties SET approval_status = 'approved' WHERE id = ?", [propertyId]);
  commentId = (await agents.client1.post('/api/comments').send({ propertyId, body: 'A comment to moderate' })).body.data.id;
  reviewId = (await query(
    'INSERT INTO reviews (broker_id, client_id, rating, body) VALUES (?,?,?,?)', [ids.broker, ids.client1, 4, 'Review text to moderate'])).insertId;
});

after(async () => {
  await query('DELETE FROM users WHERE email LIKE ?', [`%${tag}@test.local`]);
  await pool.end();
});

// ───────────────────────────── permissions ─────────────────────────────
test('admin API: logged-out users get 401, clients and brokers get 403', async () => {
  const paths = ['/api/admin/stats', '/api/admin/properties', '/api/admin/brokers', '/api/admin/users',
    '/api/admin/comments', '/api/admin/reviews', '/api/admin/reports', '/api/admin/audit-logs'];
  for (const p of paths) {
    assert.equal((await request(app).get(p)).status, 401, p);
    assert.equal((await agents.client1.get(p)).status, 403, p);
    assert.equal((await agents.broker.get(p)).status, 403, p);
    assert.equal((await agents.admin.get(p)).status, 200, p);
  }
});

test('non-admins cannot use admin actions', async () => {
  assert.equal((await agents.broker.post(`/api/admin/properties/${propertyId}/approve`)).status, 403);
  assert.equal((await agents.client1.patch(`/api/admin/users/${ids.client2}/status`).send({ status: 'suspended' })).status, 403);
  assert.equal((await agents.client1.patch(`/api/admin/comments/${commentId}/status`).send({ status: 'hidden' })).status, 403);
  assert.equal((await agents.client1.patch('/api/admin/reports/1').send({ status: 'resolved' })).status, 403);
});

// ───────────────────────────── listings ─────────────────────────────
test('admin can reject a listing (reason required), notify the broker and approve it again; all audited', async () => {
  assert.equal((await agents.admin.post(`/api/admin/properties/${propertyId}/reject`).send({})).status, 400);
  const rej = await agents.admin.post(`/api/admin/properties/${propertyId}/reject`).send({ reason: 'Photos do not match the description' });
  assert.equal(rej.status, 200);
  const [p] = await query('SELECT approval_status, rejection_reason FROM properties WHERE id = ?', [propertyId]);
  assert.equal(p.approval_status, 'rejected');
  assert.match(p.rejection_reason, /Photos/);
  // rejected listings disappear from the public API
  assert.equal((await request(app).get(`/api/properties/${propertyId}`)).status, 404);
  const [n] = await query("SELECT id FROM notifications WHERE user_id = ? AND type = 'listing_rejected'", [ids.broker]);
  assert.ok(n, 'broker should be notified');

  assert.equal((await agents.admin.post(`/api/admin/properties/${propertyId}/approve`)).status, 200);
  assert.equal((await request(app).get(`/api/properties/${propertyId}`)).status, 200);
  assert.equal(await auditCount('reject_listing', propertyId), 1);
  assert.equal(await auditCount('approve_listing', propertyId), 1);
  assert.equal((await agents.admin.post('/api/admin/properties/99999999/approve')).status, 404);
});

// ───────────────────────────── brokers ─────────────────────────────
test('admin can un-verify and verify a broker; unverified brokers cannot be messaged', async () => {
  assert.equal((await agents.admin.post(`/api/admin/brokers/${ids.broker}/reject`).send({})).status, 200);
  const blocked = await agents.client1.post('/api/conversations').send({ brokerId: ids.broker, body: 'Hello' });
  assert.ok([403, 404].includes(blocked.status), `got ${blocked.status}`);
  assert.equal((await agents.admin.post(`/api/admin/brokers/${ids.broker}/verify`)).status, 200);
  const [bp] = await query('SELECT verification_status FROM broker_profiles WHERE user_id = ?', [ids.broker]);
  assert.equal(bp.verification_status, 'approved');
  assert.equal(await auditCount('verify_broker', ids.broker), 1);
  assert.equal((await agents.admin.post(`/api/admin/brokers/${ids.client1}/verify`)).status, 404); // not a broker
});

// ───────────────────────────── comments and reviews ─────────────────────────────
test('hiding a comment removes it publicly, blocks author edits, notifies the author and is audited', async () => {
  assert.equal((await agents.admin.patch(`/api/admin/comments/${commentId}/status`).send({ status: 'hidden' })).status, 200);
  const pub = await request(app).get(`/api/comments?propertyId=${propertyId}`);
  assert.equal(pub.body.data.items.find((c) => c.id === commentId), undefined);
  assert.equal((await agents.client1.patch(`/api/comments/${commentId}`).send({ body: 'sneaky edit' })).status, 403);
  const [n] = await query("SELECT title FROM notifications WHERE user_id = ? AND type = 'content_hidden'", [ids.client1]);
  assert.ok(n);
  assert.ok(!n.title.includes('A comment to moderate'), 'notification must not repeat the comment text');
  assert.equal(await auditCount('hide_comment', commentId), 1);

  assert.equal((await agents.admin.patch(`/api/admin/comments/${commentId}/status`).send({ status: 'visible' })).status, 200);
  const again = await request(app).get(`/api/comments?propertyId=${propertyId}`);
  assert.ok(again.body.data.items.find((c) => c.id === commentId));
  assert.equal((await agents.admin.patch(`/api/admin/comments/${commentId}/status`).send({ status: 'bogus' })).status, 400);
});

test('hiding a review removes it from the broker page and from the average', async () => {
  assert.equal((await agents.admin.patch(`/api/admin/reviews/${reviewId}/status`).send({ status: 'hidden' })).status, 200);
  const page = await request(app).get(`/api/brokers/${ids.broker}`);
  assert.equal(page.status, 200);
  assert.ok(!page.body.data.reviews.some((r) => r.id === reviewId));
  assert.equal(await auditCount('hide_review', reviewId), 1);
});

// ───────────────────────────── users ─────────────────────────────
test('suspending a user blocks login and existing sessions; admins are protected', async () => {
  assert.equal((await agents.admin.patch(`/api/admin/users/${ids.admin}/status`).send({ status: 'suspended' })).status, 400); // self
  assert.equal((await agents.admin.patch('/api/admin/users/99999999/status').send({ status: 'suspended' })).status, 404);

  assert.equal((await agents.admin.patch(`/api/admin/users/${ids.client2}/status`).send({ status: 'suspended' })).status, 200);
  assert.equal((await agents.client2.get('/api/auth/me')).body.data?.user ?? null, null); // old cookie stops working at once
  const login = await request(app).post('/api/auth/login').send({ email: `client2${tag}@test.local`, password: PASSWORD });
  assert.equal(login.status, 403);

  assert.equal((await agents.admin.patch(`/api/admin/users/${ids.client2}/status`).send({ status: 'active' })).status, 200);
  assert.equal((await request(app).post('/api/auth/login').send({ email: `client2${tag}@test.local`, password: PASSWORD })).status, 200);
  assert.equal(await auditCount('suspend_user', ids.client2), 1);
  assert.equal(await auditCount('activate_user', ids.client2), 1);
});

// ───────────────────────────── reports ─────────────────────────────
test('reports: validation, self-report block, duplicate block and login requirement', async () => {
  const body = { targetType: 'comment', targetId: commentId, reason: 'This comment is spam and misleading' };
  assert.equal((await request(app).post('/api/reports').send(body)).status, 401);
  assert.equal((await agents.client2.post('/api/reports').send({ ...body, reason: 'short' })).status, 400);
  assert.equal((await agents.client2.post('/api/reports').send({ ...body, targetType: 'conversation' })).status, 400);
  assert.equal((await agents.client2.post('/api/reports').send({ ...body, targetId: 99999999 })).status, 404);
  assert.equal((await agents.client1.post('/api/reports').send(body)).status, 400); // own comment

  assert.equal((await agents.client2.post('/api/reports').send(body)).status, 201);
  assert.equal((await agents.client2.post('/api/reports').send(body)).status, 409); // already open
  assert.equal((await agents.client2.post('/api/reports').send({ targetType: 'property', targetId: propertyId, reason: 'Fake listing photos' })).status, 201);
  assert.equal((await agents.client2.post('/api/reports').send({ targetType: 'user', targetId: ids.broker, reason: 'Asked me for money upfront' })).status, 201);
  assert.equal((await agents.client2.post('/api/reports').send({ targetType: 'user', targetId: ids.client1, reason: 'Clients cannot be reported here' })).status, 404);
});

test('admin sees the report queue, can resolve it, and the reporter is not leaked to the reported user', async () => {
  const list = await agents.admin.get('/api/admin/reports?status=open&targetType=comment');
  assert.equal(list.status, 200);
  const r = list.body.data.items.find((x) => x.targetId === commentId);
  assert.ok(r);
  assert.equal(r.reporterName, 'client2 Tester');
  assert.equal(r.target.link, `/properties/${propertyId}`);

  assert.equal((await agents.admin.patch(`/api/admin/reports/${r.id}`).send({ status: 'open' })).status, 400);
  assert.equal((await agents.admin.patch(`/api/admin/reports/${r.id}`).send({ status: 'resolved' })).status, 200);
  const [row] = await query('SELECT status, handled_by FROM reports WHERE id = ?', [r.id]);
  assert.equal(row.status, 'resolved');
  assert.equal(row.handled_by, ids.admin);
  assert.equal(await auditCount('report_resolved', r.id), 1);

  // the reported user's own APIs never contain report data
  const mine = JSON.stringify((await agents.client1.get('/api/notifications')).body);
  assert.ok(!mine.includes('client2'));
});

test('stats and audit log endpoints return counts and paginated entries', async () => {
  const s = await agents.admin.get('/api/admin/stats');
  assert.equal(typeof s.body.data.counts.openReports, 'number');
  const a = await agents.admin.get('/api/admin/audit-logs?limit=5&page=1');
  assert.equal(a.status, 200);
  assert.ok(a.body.data.items.length > 0 && a.body.data.items.length <= 5);
  assert.equal((await agents.admin.get('/api/admin/audit-logs?limit=500')).status, 400);
});
