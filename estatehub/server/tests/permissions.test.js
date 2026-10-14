// Integration tests for authentication, role permissions and property operations.
// They use the real MySQL database from server/.env, create their own users with
// random emails, and delete everything they created at the end.
// Run (MySQL must be running and `npm run db:init` done once):  npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');

const tag = Date.now();
const PASSWORD = 'Test12345';
const agents = {};   // logged-in supertest agents by name
const ids = {};      // user ids by name
let propertyId;

const property = {
  title: 'Test apartment in Uttara',
  description: 'A test listing used by the automated test suite.',
  category: 'apartment', purpose: 'sale', price: 5000000, size: 1200,
  bedrooms: 3, bathrooms: 2, city: 'Dhaka', area: 'Uttara',
};

async function signup(name, role) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    fullName: `Test ${name}`, email: `${name}${tag}@test.local`, password: PASSWORD, role,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  agents[name] = agent;
  ids[name] = res.body.data.user.id;
}

before(async () => {
  await signup('client', 'client');
  await signup('brokerA', 'broker');
  await signup('brokerB', 'broker');
  // Admins cannot be created through the API, so promote one test user directly in the DB.
  await signup('admin', 'client');
  await query("UPDATE users SET role = 'admin' WHERE id = ?", [ids.admin]);
});

after(async () => {
  await query('DELETE FROM users WHERE email LIKE ?', [`%${tag}@test.local`]); // cascades to properties
  await pool.end();
});

test('cannot register as admin', async () => {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Evil User', email: `evil${tag}@test.local`, password: PASSWORD, role: 'admin',
  });
  assert.equal(res.status, 400);
});

test('login fails with wrong password', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: `client${tag}@test.local`, password: 'wrong' });
  assert.equal(res.status, 401);
});

test('API responses never contain password hashes', async () => {
  const res = await agents.client.get('/api/auth/me');
  assert.equal(res.status, 200);
  assert.ok(!JSON.stringify(res.body).includes('password'));
});

test('profile update cannot change role', async () => {
  const res = await agents.client.patch('/api/auth/me').send({ role: 'admin' });
  assert.equal(res.status, 400);
  const [u] = await query('SELECT role FROM users WHERE id = ?', [ids.client]);
  assert.equal(u.role, 'client');
});

test('client cannot create a property', async () => {
  const res = await agents.client.post('/api/properties').send(property);
  assert.equal(res.status, 403);
});

test('anonymous user cannot create a property', async () => {
  const res = await request(app).post('/api/properties').send(property);
  assert.equal(res.status, 401);
});

test('broker creates a property; it starts as pending and is not public', async () => {
  const res = await agents.brokerA.post('/api/properties').send(property);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  propertyId = res.body.data.id;
  assert.equal(res.body.data.approvalStatus, 'pending');

  const publicRes = await request(app).get(`/api/properties/${propertyId}`);
  assert.equal(publicRes.status, 404);
  const list = await request(app).get('/api/properties?limit=50&q=automated test suite');
  assert.ok(!list.body.data.items.some((p) => p.id === propertyId));
});

test('validation rejects a bad property', async () => {
  const res = await agents.brokerA.post('/api/properties').send({ ...property, price: -5, title: 'x' });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.price);
});

test("another broker cannot edit or delete someone else's property", async () => {
  const edit = await agents.brokerB.patch(`/api/properties/${propertyId}`).send({ title: 'Hijacked title' });
  assert.equal(edit.status, 403);
  const del = await agents.brokerB.delete(`/api/properties/${propertyId}`);
  assert.equal(del.status, 403);
});

test('approved property becomes public, hides the street address, and edits trigger re-approval', async () => {
  await agents.brokerA.patch(`/api/properties/${propertyId}`).send({ addressLine: 'House 1, Road 2, Sector 7' });
  await query("UPDATE properties SET approval_status = 'approved' WHERE id = ?", [propertyId]);

  const pub = await request(app).get(`/api/properties/${propertyId}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.addressLine, undefined);

  const owner = await agents.brokerA.get(`/api/properties/${propertyId}`);
  assert.equal(owner.body.data.addressLine, 'House 1, Road 2, Sector 7');

  const edit = await agents.brokerA.patch(`/api/properties/${propertyId}`).send({ price: 5200000 });
  assert.equal(edit.body.data.approvalStatus, 'pending');
  assert.equal((await request(app).get(`/api/properties/${propertyId}`)).status, 404);
});

test('public search filters work on real data', async () => {
  await query("UPDATE properties SET approval_status = 'approved' WHERE id = ?", [propertyId]);
  const hit = await request(app).get('/api/properties?area=Uttara&category=apartment&purpose=sale&maxPrice=6000000&limit=50');
  assert.ok(hit.body.data.items.some((p) => p.id === propertyId));
  const miss = await request(app).get('/api/properties?maxPrice=1000&limit=50');
  assert.ok(!miss.body.data.items.some((p) => p.id === propertyId));
});

test('owner can delete their property', async () => {
  const res = await agents.brokerA.delete(`/api/properties/${propertyId}`);
  assert.equal(res.status, 200);
});
