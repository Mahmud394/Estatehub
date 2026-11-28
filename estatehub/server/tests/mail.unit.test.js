// Unit tests for the email helpers (no database, no real SMTP).
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLIENT_URL = 'https://example.test';
delete process.env.SMTP_HOST; // not configured
const mail = require('../src/services/mailService');

test('reset email carries a link to /reset-password with the token', () => {
  const { text, html } = mail.buildAction({ headline: 'h', body: 'b', linkLabel: 'Go', url: 'https://example.test/reset-password?token=abc', footer: 'f' });
  assert.match(text, /reset-password\?token=abc/);
  assert.match(html, /href="https:\/\/example\.test\/reset-password\?token=abc"/);
});

test('user-supplied text is HTML-escaped', () => {
  const { html } = mail.buildAction({ headline: '<script>x</script>', body: 'b', linkLabel: 'Go', url: 'https://e.test', footer: 'f' });
  assert.ok(!html.includes('<script>'));
});

test('with SMTP not configured, the test email reports a clear reason instead of throwing', async () => {
  const r = await mail.sendTestEmail('a@b.com');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_configured');
  assert.match(mail.explainMailFailure(r.reason), /SMTP_HOST/);
});

test('failure reasons are explained in plain words', () => {
  assert.match(mail.explainMailFailure('EAUTH'), /App Password/);
  assert.match(mail.explainMailFailure('ETIMEDOUT'), /SMTP_PORT/);
});

test('welcome and reset helpers never throw when SMTP is off', () => {
  mail.sendWelcomeEmail({ full_name: 'A', email: 'a@b.com', role: 'broker' });
  mail.sendPasswordResetEmail({ full_name: 'A', email: 'a@b.com' }, 'a'.repeat(64), 30);
});
