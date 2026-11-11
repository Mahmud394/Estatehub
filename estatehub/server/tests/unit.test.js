// Unit tests that need NO database: name privacy, email content and input validation.
// Run with the other tests:  npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { publicName } = require('../src/utils/names');
const { buildNotification } = require('../src/services/mailService');
const env = require('../src/config/env');
const s = require('../src/validators/interactionSchemas');

test('publicName shows clients as "First L." and brokers with their full name', () => {
  assert.equal(publicName('Rahim Uddin Ahmed', 'client'), 'Rahim A.');
  assert.equal(publicName('Nusrat', 'client'), 'Nusrat');
  assert.equal(publicName('Pritun', 'client'), 'Pritun');
  assert.equal(publicName('Mahmud Un Nabi', 'broker'), 'Mahmud Un Nabi');
  assert.equal(publicName('Nuhash', 'client'), 'Nuhash');
});

test('notification emails contain the property title and one link, and escape HTML', () => {
  const { text, html } = buildNotification({
    headline: 'A client sent you a new message.',
    propertyTitle: '<script>alert(1)</script> Flat',
    path: '/broker/messages/7',
    linkLabel: 'Open your messages',
  });
  assert.ok(text.includes(`${env.clientUrl}/broker/messages/7`));
  assert.ok(text.includes('log in'), 'tells the reader to log in first');
  assert.ok(!html.includes('<script>'), 'user text must be escaped in HTML');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!/token|password/i.test(text + html), 'no secrets in links');
});

test('text fields: control characters are removed, spaces trimmed, limits enforced', () => {
  const ok = s.commentCreate.parse({ propertyId: '5', body: '  Hello\u0000 there\u0007  ' });
  assert.equal(ok.propertyId, 5);
  assert.equal(ok.body, 'Hello there');
  assert.equal(s.commentCreate.safeParse({ propertyId: 1, body: '   ' }).success, false);
  assert.equal(s.commentCreate.safeParse({ propertyId: 1, body: 'x'.repeat(1001) }).success, false);
  assert.equal(s.commentCreate.safeParse({ propertyId: 1, body: 'x'.repeat(1000) }).success, true);
  assert.equal(s.messageCreate.safeParse({ body: 'y'.repeat(2001) }).success, false);
});

test('an update request cannot smuggle in other fields', () => {
  assert.equal(s.commentUpdate.safeParse({ body: 'ok', userId: 99 }).success, false);
  assert.equal(s.messageCreate.safeParse({ body: 'ok', senderId: 99 }).success, false);
  assert.equal(s.reviewUpdate.safeParse({ rating: 3, brokerId: 2 }).success, false);
});

test('reviews: rating must be a whole number from 1 to 5 and the text at least 10 characters', () => {
  const base = { brokerId: 3, body: 'Helpful and honest agent.' };
  for (const bad of [0, 6, 2.5, 'abc']) assert.equal(s.reviewCreate.safeParse({ ...base, rating: bad }).success, false, `rating ${bad}`);
  for (const good of [1, 3, '5']) assert.equal(s.reviewCreate.safeParse({ ...base, rating: good }).success, true, `rating ${good}`);
  const short = s.reviewCreate.safeParse({ ...base, rating: 4, body: 'Too short' });
  assert.equal(short.success, false);
  assert.match(short.error.issues[0].message, /at least 10 characters/);
});

test('starting a conversation needs a property or a broker', () => {
  assert.equal(s.conversationCreate.safeParse({ body: 'Hi' }).success, false);
  assert.equal(s.conversationCreate.safeParse({ propertyId: 4, body: 'Hi' }).success, true);
  assert.equal(s.conversationCreate.safeParse({ brokerId: 4, body: 'Hi' }).success, true);
});
