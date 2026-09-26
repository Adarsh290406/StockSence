/**
 * StockSense - PostgreSQL Database Connection & Pool Manager
 * Implements enterprise connection pooling & transaction management using 'pg'
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Configure connection pool optimized for high throughput & 100x concurrency
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stocksense',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '50', 10), // Increased max connections
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),   // Keep pre-warmed standby connections
  idleTimeoutMillis: 10000,                           // Free idle connections faster
  connectionTimeoutMillis: 3000,                      // Fast-fail if pool is starved
  statement_timeout: 10000,                           // Cancel long rogue queries (>10s)
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Execute a parameterized query
 * @param {string} text - SQL Query with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 */
async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[Executed SQL]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

/**
 * Run operations within an ACID compliant database transaction
 * @param {Function} callback - async function receiving client
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initialize PostgreSQL tables and indexes from schema.sql
 */
async function initSchema() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await query(schemaSql);
  console.log('✓ PostgreSQL schema synchronized successfully.');
}

module.exports = {
  pool,
  query,
  transaction,
  initSchema
};
