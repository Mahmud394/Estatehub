// MySQL connection pool. All queries use placeholders (?) so input is never concatenated into SQL.
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  // Serverless: every function instance has its own small pool, so keep it small to stay under the database's connection limit
  connectionLimit: process.env.VERCEL ? 3 : 10,
  maxIdle: process.env.VERCEL ? 1 : 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  decimalNumbers: true, // return DECIMAL columns as numbers
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };
