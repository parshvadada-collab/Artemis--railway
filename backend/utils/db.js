'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'railway_db',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:        0,
  timezone:          '+00:00',
  charset:           'utf8mb4',
  decimalNumbers:    true,
});

// Validate connectivity on startup
pool.getConnection()
  .then(conn => {
    console.log('[DB] Connection pool ready');
    conn.release();
  })
  .catch(err => {
    console.error('[DB] Failed to connect:', err.message);
    console.error('[DB] WARNING: Server is starting without Database connection!');
  });

module.exports = pool;
