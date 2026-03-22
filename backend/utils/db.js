'use strict';

const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const dbUrl = process.env.DATABASE_URL;

const poolConfig = dbUrl ? {
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
} : {
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '5432', 10),
  user:               process.env.DB_USER     || 'postgres',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'railway_db',
  ssl:                process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pgPool = new Pool(poolConfig);

// Create a wrapper that acts exactly like mysql2/promise!
function enhanceClient(client) {
  const customAdapter = async (sql, params = []) => {
    let i = 1;

    // MySQL uses ?, Postgres uses $1, $2
    // Some complex migrations might contain multiple statements, ignore parameterization for those if params are empty
    let pgSql = sql;
    if (params && params.length > 0) {
      pgSql = sql.replace(/\?/g, () => `$${i++}`);
    }

    // Postgres requires RETURNING to get insert IDs
    const isInsert = /^\s*INSERT\s/i.test(pgSql);
    if (isInsert && !/RETURNING/i.test(pgSql)) {
       pgSql += ' RETURNING *';
    }

    // Postgres boolean true/false vs MySQL 1/0
    // pg driver handles inserting booleans smoothly if the DB accepts them, 
    // but some integers might need transformation. Usually it's fine.

    try {
      // Execute the query
      const res = await client.query(pgSql, params);
      
      // Mimic mysql2's Array destruction: [rows, fields]
      const rows = res.rows || [];
      
      // Mimic affectedRows and insertId for UPDATE/DELETE/INSERT
      rows.affectedRows = res.rowCount;
      if (isInsert && rows.length > 0) {
         rows.insertId = rows[0].id || Object.values(rows[0])[0]; 
      }
      
      return [rows, res.fields];
    } catch (err) {
      console.error('[DB Error]', err.message, '\\nQUERY:', pgSql, '\\nPARAMS:', params);
      throw err;
    }
  };

  return {
    query: customAdapter,
    execute: customAdapter,
    release: client.release ? client.release.bind(client) : undefined,
    // Transactions
    beginTransaction: () => customAdapter('BEGIN'),
    commit: () => customAdapter('COMMIT'),
    rollback: () => customAdapter('ROLLBACK'),
    // Original methods
    pgClient: client
  };
}

const wrappedPool = {
  query: (sql, params) => enhanceClient(pgPool).query(sql, params),
  execute: (sql, params) => enhanceClient(pgPool).execute(sql, params),
  getConnection: async () => {
    const conn = await pgPool.connect();
    return enhanceClient(conn);
  }
};

// Validate connectivity on startup
pgPool.connect()
  .then(conn => {
    console.log('[DB] PostgreSQL pool ready');
    conn.release();
  })
  .catch(err => {
    console.error('[DB] Failed to connect:', err.message);
    console.error('[DB] WARNING: Server is starting without Database connection!');
  });

module.exports = wrappedPool;
