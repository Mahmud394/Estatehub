// Creates the EstateHub tables in an EXISTING (cloud) database. Safe to run again: it never drops or deletes anything,
// and it adds NO demo data. Use it for the real, hosted site.
// Usage (from /server, with the cloud DB settings in .env):  npm run db:init:prod
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

async function main() {
  const conn = await mysql.createConnection({ ...env.db, multipleStatements: true });
  let sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'schema.sql'), 'utf8');
  sql = sql
    .replace(/^\s*CREATE DATABASE.*$/gim, '')
    .replace(/^\s*USE .*$/gim, '')
    .replace(/^\s*SET FOREIGN_KEY_CHECKS.*$/gim, '')
    .replace(/DROP TABLE IF EXISTS[^;]*;/gi, '') // never delete existing tables
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS ');
  await conn.query(sql);
  const [rows] = await conn.query('SHOW TABLES');
  console.log(`Done. ${rows.length} tables exist in "${env.db.database}". No demo data was added.`);
  console.log('Next: npm run create-admin');
  await conn.end();
}

main().catch((err) => { console.error('Setup failed:', err.message); process.exit(1); });
