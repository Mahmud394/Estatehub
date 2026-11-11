// Sends ONE test email with your SMTP settings, so you can check them before relying on notifications.
// Usage (from /server):  npm run mail:test you@example.com
const env = require('../config/env');
const { sendMail } = require('../services/mailService');

(async () => {
  const to = process.argv[2];
  if (!to) {
    console.log('Usage: npm run mail:test your-email@example.com');
    process.exit(1);
  }
  if (!env.smtp.host) {
    console.log('SMTP_HOST is empty in server/.env, so there is nothing to test. See the "Email notifications" section of the README.');
    process.exit(1);
  }
  const sent = await sendMail({
    to,
    subject: 'EstateHub test email',
    text: 'If you can read this, your EstateHub SMTP settings work.',
    html: '<p>If you can read this, your <strong>EstateHub</strong> SMTP settings work.</p>',
  });
  console.log(sent ? `Test email sent to ${to}.` : 'Sending failed. The reason is printed above.');
  process.exit(sent ? 0 : 1);
})();
