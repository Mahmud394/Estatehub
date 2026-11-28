// Email notifications with Nodemailer.
//
// Rules this file enforces:
//  * If SMTP is not configured, emails are skipped quietly (the app keeps working).
//  * A failed email NEVER breaks the request that triggered it. It is logged without secrets.
//  * Emails contain only the property title and a link to the dashboard. They never contain
//    message or comment text, phone numbers or other personal details.
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
let warnedNotConfigured = false;

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 465 = implicit TLS, other ports upgrade with STARTTLS
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sends one email and says what happened: { ok, reason }. Never throws.
// reason is a short code such as "not_configured" or "EAUTH" (never a password or the full config).
async function deliver({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNotConfigured) {
      console.log('[mail] SMTP is not configured, so emails are skipped. In-app notifications still work.');
      warnedNotConfigured = true;
    }
    return { ok: false, reason: 'not_configured' };
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text, html });
    return { ok: true };
  } catch (err) {
    const reason = err.code || err.message;
    console.error('[mail] could not send an email:', reason);
    return { ok: false, reason };
  }
}

// Returns true if the email was handed to the SMTP server, false otherwise. Never throws.
async function sendMail(msg) {
  return (await deliver(msg)).ok;
}

// A friendly explanation for the admin "test email" button.
function explainMailFailure(reason) {
  if (reason === 'not_configured') return 'SMTP_HOST is empty. Add the SMTP_* variables in the hosting dashboard and redeploy.';
  if (reason === 'EAUTH') return 'Gmail rejected the login. Use a 16-character App Password (2-Step Verification must be on) in SMTP_PASS.';
  if (reason === 'ESOCKET' || reason === 'ECONNECTION' || reason === 'ETIMEDOUT') return 'Could not reach the SMTP server. Check SMTP_HOST and SMTP_PORT (587 for Gmail).';
  if (reason === 'EENVELOPE') return 'The sender or recipient address was refused. Check MAIL_FROM (no surrounding quotes) and the recipient.';
  return `The mail server returned: ${reason}`;
}

// Builds the standard notification email: a short sentence, the property title and one link.
function buildNotification({ headline, propertyTitle, path, linkLabel }) {
  const link = `${env.clientUrl}${path}`;
  const title = propertyTitle ? `\nProperty: ${propertyTitle}` : '';
  const text = `${headline}${title}\n\n${linkLabel}: ${link}\n\nYou need to log in to EstateHub to read it.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#101820">
  <h2 style="font-family:Georgia,serif;margin:0 0 12px">EstateHub</h2>
  <p>${escapeHtml(headline)}</p>
  ${propertyTitle ? `<p><strong>Property:</strong> ${escapeHtml(propertyTitle)}</p>` : ''}
  <p><a href="${escapeHtml(link)}" style="background:#174C3C;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">${escapeHtml(linkLabel)}</a></p>
  <p style="font-size:12px;color:#666">You need to log in to EstateHub to read it.</p>
</div>`;
  return { text, html };
}

// Fire-and-forget helper used by controllers (the HTTP response does not wait for SMTP).
function notifyByEmail(to, subject, parts) {
  const { text, html } = buildNotification(parts);
  background(sendMail({ to, subject, text, html }));
}

// On Vercel a function is frozen right after the response, so tell it to wait for the email to finish.
function background(promise) {
  try { require('@vercel/functions').waitUntil(promise); } catch { /* not on Vercel: nothing to do */ }
}

// Generic one-button email (welcome, password reset).
function buildAction({ headline, body, linkLabel, url, footer }) {
  const text = `${headline}\n\n${body}\n\n${linkLabel}: ${url}\n\n${footer}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#101820">
  <h2 style="font-family:Georgia,serif;margin:0 0 12px">EstateHub</h2>
  <p><strong>${escapeHtml(headline)}</strong></p>
  <p>${escapeHtml(body)}</p>
  <p><a href="${escapeHtml(url)}" style="background:#174C3C;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">${escapeHtml(linkLabel)}</a></p>
  <p style="font-size:12px;color:#666">${escapeHtml(footer)}</p>
</div>`;
  return { text, html };
}

function sendWelcomeEmail(user) {
  const isBroker = user.role === 'broker';
  const { text, html } = buildAction({
    headline: `Welcome to EstateHub, ${user.full_name}!`,
    body: isBroker
      ? 'Your broker account is ready. Complete your profile and post your first listing. An admin will verify your account, and you will get an email when that happens.'
      : 'Your account is ready. Browse listings, save favorites and message brokers directly.',
    linkLabel: isBroker ? 'Open your dashboard' : 'Browse properties',
    url: `${env.clientUrl}${isBroker ? '/broker' : '/properties'}`,
    footer: 'You received this because an account was created with this email address.',
  });
  background(sendMail({ to: user.email, subject: 'Welcome to EstateHub', text, html }));
}

function sendPasswordResetEmail(user, token, minutes) {
  const url = `${env.clientUrl}/reset-password?token=${token}`;
  const { text, html } = buildAction({
    headline: 'Reset your EstateHub password',
    body: `Click the button to choose a new password. This link works once and expires in ${minutes} minutes.`,
    linkLabel: 'Choose a new password',
    url,
    footer: 'If you did not ask for this, ignore this email. Your password stays the same.',
  });
  background(sendMail({ to: user.email, subject: 'Reset your EstateHub password', text, html }));
}

// Used by the admin "Send test email" button. Waits for the result so the admin sees the real reason.
async function sendTestEmail(to) {
  const { text, html } = buildAction({
    headline: 'EstateHub test email',
    body: 'If you can read this, your SMTP settings work and emails from your site will be delivered.',
    linkLabel: 'Open EstateHub',
    url: env.clientUrl,
    footer: 'Sent from the admin panel.',
  });
  return deliver({ to, subject: 'EstateHub test email', text, html });
}

module.exports = { sendMail, notifyByEmail, buildNotification, buildAction, sendWelcomeEmail, sendPasswordResetEmail, sendTestEmail, explainMailFailure };
