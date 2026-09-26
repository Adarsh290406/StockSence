/**
 * StockSense - Move History & Stock Ledger Routes (PostgreSQL)
 * Provides an immutable audit trail of all physical stock movements
 * (Receipts, Deliveries, Internal Transfers, and Inventory Adjustments).
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateUser } = require('./auth');

// Apply authentication
router.use(authenticateUser);

/**
 * GET /api/ledger
 * Query Params: ?product_id=&movement_type=&location_id=&from_date=&to_date=&limit=50&offset=0
 * Returns chronologically sorted immutable movement history matching Excalidraw "Move History" screen.
 */
router.get('/', async (req, res) => {
  try {
    const {
      product_id,
      movement_type,
      location_id,
      from_date,
      to_date,
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT
        sl.id,
        sl.reference_no,
        sl.movement_type,
        sl.quantity,
        sl.notes,
        sl.created_at,
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.uom AS product_uom,
        fl.name AS from_location_name,
        fl.short_code AS from_location_code,
        tl.name AS to_location_name,
        tl.short_code AS to_location_code,
        u.name AS user_name
      FROM stock_ledger sl
      JOIN products p ON p.id = sl.product_id
      LEFT JOIN locations fl ON fl.id = sl.from_location_id
      LEFT JOIN locations tl ON tl.id = sl.to_location_id
      LEFT JOIN users u ON u.id = sl.user_id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      params.push(product_id);
      sql += ` AND sl.product_id = $${params.length}`;
    }

    if (movement_type) {
      params.push(movement_type);
      sql += ` AND sl.movement_type = $${params.length}`;
    }

    if (location_id) {
      params.push(location_id);
      sql += ` AND (sl.from_location_id = $${params.length} OR sl.to_location_id = $${params.length})`;
    }

    if (from_date) {
      params.push(from_date);
      sql += ` AND sl.created_at >= $${params.length}`;
    }

    if (to_date) {
      params.push(to_date);
      sql += ` AND sl.created_at <= $${params.length}`;
    }

    sql += ` ORDER BY sl.created_at DESC, sl.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(Number(limit), 200), Number(offset));

    const result = await query(sql, params);

    // Get total count for pagination
    const countRes = await query('SELECT count(1) AS total FROM stock_ledger');

    return res.json({
      success: true,
      total: Number(countRes.rows[0]?.total || 0),
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error('Fetch ledger error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve stock move history' });
  }
});

module.exports = router;
