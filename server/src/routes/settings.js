/**
 * StockSense - Settings Routes (Warehouses & Locations Management)
 * Corresponds to Excalidraw "Warehouse" and "Location" configuration screens.
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db/database');
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
router.get('/warehouses', (req, res) => {
    try {
        const warehouses = query(`
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
        return res.json({ success: true, data: warehouses });
    } catch (err) {
        console.error('Fetch warehouses error:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve warehouses' });
    }
});

/**
 * POST /api/settings/warehouses
 * Create a new warehouse
 */
router.post('/warehouses', (req, res) => {
    try {
        const { name, short_code, address = '' } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Warehouse name is required (min 2 characters)' });
        }
        if (!short_code || typeof short_code !== 'string' || short_code.trim().length < 1) {
            return res.status(400).json({ success: false, error: 'Warehouse short code is required (e.g. WH, NDH)' });
        }

        const cleanCode = short_code.trim().toUpperCase();

        const existing = queryOne('SELECT id FROM warehouses WHERE short_code = ?', [cleanCode]);
        if (existing) {
            return res.status(409).json({ success: false, error: `Warehouse with short code '${cleanCode}' already exists` });
        }

        const result = run(
            'INSERT INTO warehouses (name, short_code, address) VALUES (?, ?, ?)',
            [name.trim(), cleanCode, address.trim()]
        );

        const newWh = queryOne('SELECT * FROM warehouses WHERE id = ?', [result.lastInsertRowid]);
        return res.status(201).json({ success: true, message: 'Warehouse created successfully', data: newWh });
    } catch (err) {
        console.error('Create warehouse error:', err);
        return res.status(500).json({ success: false, error: 'Failed to create warehouse' });
    }
});

/**
 * PUT /api/settings/warehouses/:id
 * Update an existing warehouse
 */
router.put('/warehouses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, short_code, address = '' } = req.body;

        const warehouse = queryOne('SELECT id FROM warehouses WHERE id = ?', [id]);
        if (!warehouse) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }

        const cleanCode = short_code ? short_code.trim().toUpperCase() : null;
        if (cleanCode) {
            const conflict = queryOne('SELECT id FROM warehouses WHERE short_code = ? AND id != ?', [cleanCode, id]);
            if (conflict) {
                return res.status(409).json({ success: false, error: `Short code '${cleanCode}' is already in use` });
            }
        }

        run(
            `UPDATE warehouses SET 
                name = COALESCE(?, name),
                short_code = COALESCE(?, short_code),
                address = COALESCE(?, address),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name ? name.trim() : null, cleanCode, address !== undefined ? address.trim() : null, id]
        );

        const updated = queryOne('SELECT * FROM warehouses WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Warehouse updated successfully', data: updated });
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
router.get('/locations', (req, res) => {
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
            sql += ' WHERE l.warehouse_id = ? ';
            params.push(warehouse_id);
        }

        sql += ' GROUP BY l.id ORDER BY l.warehouse_id ASC, l.name ASC';

        const locations = query(sql, params);
        return res.json({ success: true, data: locations });
    } catch (err) {
        console.error('Fetch locations error:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve locations' });
    }
});

/**
 * POST /api/settings/locations
 * Create a new location within a warehouse
 */
router.post('/locations', (req, res) => {
    try {
        const { warehouse_id, name, short_code, location_type = 'internal' } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Location name is required' });
        }
        if (!short_code || typeof short_code !== 'string') {
            return res.status(400).json({ success: false, error: 'Location short code is required (e.g. WH-STOCK)' });
        }

        const cleanCode = short_code.trim().toUpperCase();

        const conflict = queryOne('SELECT id FROM locations WHERE short_code = ?', [cleanCode]);
        if (conflict) {
            return res.status(409).json({ success: false, error: `Location short code '${cleanCode}' already exists` });
        }

        const validTypes = ['internal', 'vendor', 'customer', 'inventory_loss'];
        const cleanType = validTypes.includes(location_type) ? location_type : 'internal';

        const result = run(
            'INSERT INTO locations (warehouse_id, name, short_code, location_type) VALUES (?, ?, ?, ?)',
            [warehouse_id || null, name.trim(), cleanCode, cleanType]
        );

        const newLoc = queryOne(`
            SELECT l.*, w.name AS warehouse_name 
            FROM locations l 
            LEFT JOIN warehouses w ON w.id = l.warehouse_id 
            WHERE l.id = ?
        `, [result.lastInsertRowid]);

        return res.status(201).json({ success: true, message: 'Location created successfully', data: newLoc });
    } catch (err) {
        console.error('Create location error:', err);
        return res.status(500).json({ success: false, error: 'Failed to create location' });
    }
});

module.exports = router;
