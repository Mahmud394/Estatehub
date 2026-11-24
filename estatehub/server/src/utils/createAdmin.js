// Creates (or promotes) the real administrator account. Admins cannot register through the website.
// Usage (from /server):  npm run create-admin
// It asks for the name, email and password. The password is never printed or stored anywhere except as a bcrypt hash.
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/db');
const { registerSchema } = require('../validators/authSchemas');

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
  }
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); if (hidden) console.log(); resolve(a.trim()); }));
}

async function main() {
  const fullName = await ask('Admin full name: ');
  const email = await ask('Admin email: ');
  const password = await ask('Password (min 8, letter + number): ', true);
  // Reuse the same rules as normal registration
  const parsed = registerSchema.safeParse({ fullName, email, password, role: 'client' });
  if (!parsed.success) {
    console.error('Invalid input:', parsed.error.issues.map((i) => i.message).join(' '));
    process.exit(1);
  }
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const [existing] = await query('SELECT id FROM users WHERE email = ?', [parsed.data.email]);
  if (existing) {
    await query("UPDATE users SET role = 'admin', status = 'active', password_hash = ? WHERE id = ?", [hash, existing.id]);
    console.log(`Existing account ${parsed.data.email} is now an active admin and its password was reset.`);
  } else {
    await query("INSERT INTO users (full_name, email, password_hash, role) VALUES (?,?,?,'admin')", [parsed.data.fullName, parsed.data.email, hash]);
    console.log(`Admin account created for ${parsed.data.email}.`);
  }
  await pool.end();
}

main().catch((err) => { console.error('Could not create admin:', err.message); process.exit(1); });
