// Unit tests for Phase 6 that need NO database: input validation for admin and report requests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/validators/adminSchemas');

test('report: reason must be 10-500 characters and type must be known', () => {
  const ok = { targetType: 'property', targetId: '12', reason: '  This listing is fake  ' };
  const parsed = s.reportCreate.parse(ok);
  assert.equal(parsed.targetId, 12);
  assert.equal(parsed.reason, 'This listing is fake');
  assert.equal(s.reportCreate.safeParse({ ...ok, reason: 'too short' }).success, false);
  assert.equal(s.reportCreate.safeParse({ ...ok, reason: 'x'.repeat(501) }).success, false);
  assert.equal(s.reportCreate.safeParse({ ...ok, targetType: 'conversation' }).success, false);
  assert.equal(s.reportCreate.safeParse({ ...ok, targetId: -1 }).success, false);
  assert.equal(s.reportCreate.safeParse({ ...ok, status: 'resolved' }).success, false); // reporters cannot set a status
});

test('admin bodies only accept known values (no extra fields)', () => {
  assert.equal(s.userStatusBody.safeParse({ status: 'suspended' }).success, true);
  assert.equal(s.userStatusBody.safeParse({ status: 'deleted' }).success, false);
  assert.equal(s.userStatusBody.safeParse({ status: 'active', role: 'admin' }).success, false);
  assert.equal(s.moderationBody.safeParse({ status: 'hidden' }).success, true);
  assert.equal(s.reportResolveBody.safeParse({ status: 'open' }).success, false);
  assert.equal(s.rejectBody.safeParse({ reason: 'no' }).success, false);
  assert.equal(s.rejectBody.safeParse({ reason: 'Misleading photos' }).success, true);
});

test('admin list queries are capped and default sensibly', () => {
  assert.deepEqual(s.auditQuery.parse({}), { page: 1, limit: 15 });
  assert.equal(s.auditQuery.safeParse({ limit: '500' }).success, false);
  assert.equal(s.adminPropertyQuery.safeParse({ status: 'weird' }).success, false);
  assert.equal(s.adminUserQuery.parse({ q: '  rahim ' }).q, 'rahim');
});
