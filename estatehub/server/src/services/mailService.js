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

// Returns true if the email was handed to the SMTP server, false otherwise. Never throws.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNotConfigured) {
      console.log('[mail] SMTP is not configured, so email notifications are skipped. In-app notifications still work.');
      warnedNotConfigured = true;
    }
    return false;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text, html });
    return true;
  } catch (err) {
    // Log the error code/message only: never the SMTP password or the full config.
    console.error('[mail] could not send a notification email:', err.code || err.message);
    return false;
  }
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
  sendMail({ to, subject, text, html });
}

module.exports = { sendMail, notifyByEmail, buildNotification };
