/**
 * StockSense - Database Connection and Transaction Manager
 * Implements pure relational SQL engine via Node.js native SQL DatabaseSync
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'stocksense.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize SQLite connection
const db = new DatabaseSync(DB_PATH);

// Configure database pragmas for high performance and strict data integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema
function initSchema() {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);
}

// Run schema initialization
initSchema();

/**
 * Execute a SELECT query returning all matching rows
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Array}
 */
function query(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
}

/**
 * Execute a SELECT query returning the first matching row
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Object|null}
 */
function queryOne(sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 * @param {string} sql 
 * @param {Array} params 
 * @returns {{ lastInsertRowid: number, changes: number }}
 */
function run(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
}

/**
 * Execute operations within an atomic ACID transaction
 * Automatically commits on success and rolls back on error
 * @param {Function} callback 
 * @returns {*}
 */
function transaction(callback) {
    db.exec('BEGIN TRANSACTION;');
    try {
        const result = callback({ query, queryOne, run });
        db.exec('COMMIT;');
        return result;
    } catch (error) {
        db.exec('ROLLBACK;');
        throw error;
    }
}

module.exports = {
    db,
    query,
    queryOne,
    run,
    transaction,
    initSchema
};
