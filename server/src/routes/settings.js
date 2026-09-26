/**
 * StockSense - Settings Routes (Warehouses & Locations Management - PostgreSQL)
 * Corresponds to Excalidraw "Warehouse" and "Location" configuration screens.
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateUser } = require('./auth');

// Apply authentication to all settings routes
router.use(authenticateUser);

// ============================================================================
// WAREHOUSES
// ============================================================================

/**
 * GET /api/settings/warehouses
 * List all warehouses with location count
 */
router.get('/warehouses', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        w.id,
        w.name,
        w.short_code,
        w.address,
        w.created_at,
        COUNT(l.id) AS location_count
      FROM warehouses w
      LEFT JOIN locations l ON l.warehouse_id = w.id
      GROUP BY w.id
      ORDER BY w.name ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch warehouses error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve warehouses' });
  }
});

/**
 * POST /api/settings/warehouses
 * Create a new warehouse
 */
router.post('/warehouses', async (req, res) => {
  try {
    const { name, short_code, address = '' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Warehouse name is required (min 2 characters)' });
    }
    if (!short_code || typeof short_code !== 'string' || short_code.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Warehouse short code is required (e.g. WH, NDH)' });
    }

    const cleanCode = short_code.trim().toUpperCase();

    const existing = await query('SELECT id FROM warehouses WHERE short_code = $1', [cleanCode]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: `Warehouse with short code '${cleanCode}' already exists` });
    }

    const result = await query(
      'INSERT INTO warehouses (name, short_code, address) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), cleanCode, address.trim()]
    );

    return res.status(201).json({ success: true, message: 'Warehouse created successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Create warehouse error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create warehouse' });
  }
});

/**
 * PUT /api/settings/warehouses/:id
 * Update an existing warehouse
 */
router.put('/warehouses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, short_code, address = '' } = req.body;

    const existing = await query('SELECT id FROM warehouses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    const cleanCode = short_code ? short_code.trim().toUpperCase() : null;
    if (cleanCode) {
      const conflict = await query('SELECT id FROM warehouses WHERE short_code = $1 AND id != $2', [cleanCode, id]);
      if (conflict.rows.length > 0) {
        return res.status(409).json({ success: false, error: `Short code '${cleanCode}' is already in use` });
      }
    }

    const result = await query(
      `UPDATE warehouses SET 
        name = COALESCE($1, name),
        short_code = COALESCE($2, short_code),
        address = COALESCE($3, address),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name ? name.trim() : null, cleanCode, address !== undefined ? address.trim() : null, id]
    );

    return res.json({ success: true, message: 'Warehouse updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Update warehouse error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update warehouse' });
  }
});

// ============================================================================
// LOCATIONS
// ============================================================================

/**
 * GET /api/settings/locations
 * List all locations with parent warehouse details
 */
router.get('/locations', async (req, res) => {
  try {
    const { warehouse_id } = req.query;

    let sql = `
      SELECT 
        l.id,
        l.name,
        l.short_code,
        l.location_type,
        l.warehouse_id,
        w.name AS warehouse_name,
        w.short_code AS warehouse_short_code,
        l.created_at,
        COALESCE(SUM(sq.on_hand), 0) AS total_items_on_hand
      FROM locations l
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN stock_quants sq ON sq.location_id = l.id
    `;
    const params = [];

    if (warehouse_id) {
      sql += ' WHERE l.warehouse_id = $1 ';
      params.push(warehouse_id);
    }

    sql += ' GROUP BY l.id, w.name, w.short_code ORDER BY l.warehouse_id ASC, l.name ASC';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch locations error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve locations' });
  }
});

/**
 * POST /api/settings/locations
 * Create a new location within a warehouse
 */
router.post('/locations', async (req, res) => {
  try {
    const { warehouse_id, name, short_code, location_type = 'internal' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Location name is required' });
    }
    if (!short_code || typeof short_code !== 'string') {
      return res.status(400).json({ success: false, error: 'Location short code is required (e.g. WH-STOCK)' });
    }

    const cleanCode = short_code.trim().toUpperCase();

    const conflict = await query('SELECT id FROM locations WHERE short_code = $1', [cleanCode]);
    if (conflict.rows.length > 0) {
      return res.status(409).json({ success: false, error: `Location short code '${cleanCode}' already exists` });
    }

    const validTypes = ['internal', 'vendor', 'customer', 'inventory_loss'];
    const cleanType = validTypes.includes(location_type) ? location_type : 'internal';

    const result = await query(
      'INSERT INTO locations (warehouse_id, name, short_code, location_type) VALUES ($1, $2, $3, $4) RETURNING id',
      [warehouse_id || null, name.trim(), cleanCode, cleanType]
    );

    const newLocRes = await query(`
      SELECT l.*, w.name AS warehouse_name 
      FROM locations l 
      LEFT JOIN warehouses w ON w.id = l.warehouse_id 
      WHERE l.id = $1
    `, [result.rows[0].id]);

    return res.status(201).json({ success: true, message: 'Location created successfully', data: newLocRes.rows[0] });
  } catch (err) {
    console.error('Create location error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create location' });
  }
});

module.exports = router;
