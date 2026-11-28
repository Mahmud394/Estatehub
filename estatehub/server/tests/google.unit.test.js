// Unit tests for Google ID-token verification (no network: we sign tokens with our own test key).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyGoogleIdToken } = require('../src/services/googleAuth');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' };
const keys = [jwk];
const CLIENT = 'client-id.apps.googleusercontent.com';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function token(claims = {}, { kid = 'k1', alg = 'RS256', key = privateKey } = {}) {
  const base = { iss: 'https://accounts.google.com', aud: CLIENT, sub: '123', email: 'Ann@Example.com', email_verified: true,
    name: 'Ann', exp: Math.floor(Date.now() / 1000) + 600, ...claims };
  const head = `${b64({ alg, kid, typ: 'JWT' })}.${b64(base)}`;
  return `${head}.${crypto.sign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
}
const verify = (t, o = {}) => verifyGoogleIdToken(t, { clientId: CLIENT, keys, ...o });

test('a valid token returns the profile (email lower-cased)', async () => {
  const u = await verify(token());
  assert.deepEqual([u.sub, u.email, u.name], ['123', 'ann@example.com', 'Ann']);
});
test('wrong audience is rejected', async () => assert.rejects(verify(token({ aud: 'other' })), /not issued for EstateHub/));
test('wrong issuer is rejected', async () => assert.rejects(verify(token({ iss: 'https://evil.test' })), /Invalid/));
test('expired token is rejected', async () => assert.rejects(verify(token({ exp: 1 })), /expired/));
test('unverified email is rejected', async () => assert.rejects(verify(token({ email_verified: false })), /not verified/));
test('token signed with a different key is rejected', async () => {
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  await assert.rejects(verify(token({}, { key: other })), /Invalid/);
});
test('unknown key id and non-RS256 are rejected', async () => {
  await assert.rejects(verify(token({}, { kid: 'nope' })), /Invalid/);
  await assert.rejects(verify(token({}, { alg: 'none' })), /Invalid/);
});
test('garbage and missing client id are rejected', async () => {
  await assert.rejects(verify('abc'), /Invalid/);
  await assert.rejects(verifyGoogleIdToken(token(), { clientId: '', keys }), /not configured/);
});
