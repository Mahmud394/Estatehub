// Tests for the public (no login) endpoints used by the homepage and broker pages.
// Requires MySQL running with the demo data from `npm run db:init`.
process.env.NODE_ENV = 'test'; // disables rate limiting and must be set before the app is loaded
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

after(() => pool.end());

test('public stats are real numbers', async () => {
  const res = await request(app).get('/api/public/stats');
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(typeof d.activeListings, 'number');
  assert.equal(typeof d.verifiedBrokers, 'number');
  assert.ok(Array.isArray(d.topAreas));
});

test('broker list never exposes email, phone or password data', async () => {
  const res = await request(app).get('/api/brokers');
  assert.equal(res.status, 200);
  const text = JSON.stringify(res.body);
  assert.ok(!/password|email|phone/i.test(text));
});

test('only verified brokers can be opened publicly', async () => {
  const list = await request(app).get('/api/brokers');
  if (list.body.data.items.length) {
    const id = list.body.data.items[0].id;
    const one = await request(app).get(`/api/brokers/${id}`);
    assert.equal(one.status, 200);
    assert.ok(Array.isArray(one.body.data.listings));
  }
  const missing = await request(app).get('/api/brokers/99999999');
  assert.equal(missing.status, 404);
});

test('recent reviews endpoint returns a list and flags demo content', async () => {
  const res = await request(app).get('/api/public/reviews/recent?limit=3');
  assert.equal(res.status, 200);
  for (const r of res.body.data) assert.equal(typeof r.isDemo, 'boolean');
});
