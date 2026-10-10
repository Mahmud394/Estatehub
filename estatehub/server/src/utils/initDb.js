const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const seed = require('./seedDemo');

// Creates the database from database/schema.sql, then inserts demo data.
// Usage (from /server):  npm run db:init
async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  await conn.query(fs.readFileSync(schemaPath, 'utf8'));
  console.log('Schema created.');
  await conn.end();

  await seed();
  console.log('Database ready.');
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
