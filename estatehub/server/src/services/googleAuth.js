// Verifies a "Sign in with Google" ID token WITHOUT any extra package.
// Google signs the token (RS256). We check the signature against Google's public keys, then the claims
// (audience = our client id, issuer = Google, not expired, email verified).
const crypto = require('crypto');
const env = require('../config/env');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
let cache = { keys: null, until: 0 };

async function getKeys(fetchImpl = fetch) {
  if (cache.keys && Date.now() < cache.until) return cache.keys;
  const res = await fetchImpl(CERTS_URL);
  if (!res.ok) throw new Error('Could not load Google signing keys.');
  const body = await res.json();
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers?.get?.('cache-control') || '')?.[1]) || 3600;
  cache = { keys: body.keys || [], until: Date.now() + maxAge * 1000 };
  return cache.keys;
}

const b64json = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

// Returns { sub, email, name, picture } or throws an Error with a safe message.
async function verifyGoogleIdToken(idToken, { clientId = env.googleClientId, keys, now = Date.now() } = {}) {
  if (!clientId) throw new Error('Google sign-in is not configured.');
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Google token.');
  let header, claims;
  try { header = b64json(parts[0]); claims = b64json(parts[1]); } catch { throw new Error('Invalid Google token.'); }
  if (header.alg !== 'RS256') throw new Error('Invalid Google token.');

  const jwk = (keys || (await getKeys())).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Invalid Google token.');
  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url')
  );
  if (!valid) throw new Error('Invalid Google token.');
  if (claims.aud !== clientId) throw new Error('This Google token was not issued for EstateHub.');
  if (!ISSUERS.includes(claims.iss)) throw new Error('Invalid Google token.');
  if (!claims.exp || claims.exp * 1000 < now) throw new Error('The Google sign-in has expired. Please try again.');
  if (!claims.email || !(claims.email_verified === true || claims.email_verified === 'true')) {
    throw new Error('Your Google email is not verified.');
  }
  return { sub: String(claims.sub), email: String(claims.email).toLowerCase(), name: claims.name || claims.email, picture: claims.picture || null };
}

module.exports = { verifyGoogleIdToken };
