/**
 * StockSense - Dashboard & Real-Time Metrics Routes (PostgreSQL)
 * Aggregates live KPI counters matching Excalidraw Dashboard:
 * - Total Receipts to process (and Late count)
 * - Total Deliveries to process (and Waiting/Ready count)
 * - Low stock / replenishment alert counters
 * - Total inventory valuation
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateUser } = require('./auth');

// Apply authentication
router.use(authenticateUser);

/**
 * GET /api/dashboard/kpis
 * Returns real-time metrics for Dashboard Cards
 */
router.get('/kpis', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Execute queries in parallel for ultra-low latency & efficiency
    const [receiptsRes, deliveriesRes, stockValRes, lowStockRes, recentActivity] = await Promise.all([
      // 1. Receipts KPIs
      query(`
        SELECT 
          COUNT(1) AS total_receipts,
          COUNT(1) FILTER (WHERE status IN ('draft', 'waiting', 'ready')) AS pending_receipts,
          COUNT(1) FILTER (WHERE status IN ('draft', 'waiting', 'ready') AND scheduled_date < $1) AS late_receipts,
          COUNT(1) FILTER (WHERE status = 'ready') AS ready_receipts
        FROM operations
        WHERE operation_type = 'receipt'
      `, [today]),

      // 2. Deliveries KPIs
      query(`
        SELECT 
          COUNT(1) AS total_deliveries,
          COUNT(1) FILTER (WHERE status IN ('draft', 'waiting', 'ready')) AS pending_deliveries,
          COUNT(1) FILTER (WHERE status IN ('draft', 'waiting', 'ready') AND scheduled_date < $1) AS late_deliveries,
          COUNT(1) FILTER (WHERE status = 'ready') AS ready_deliveries,
          COUNT(1) FILTER (WHERE status = 'waiting') AS waiting_deliveries
        FROM operations
        WHERE operation_type = 'delivery'
      `, [today]),

      // 3. Stock Value & Total Items
      query(`
        SELECT 
          COALESCE(SUM(sq.on_hand), 0) AS total_units_on_hand,
          COALESCE(SUM(sq.reserved), 0) AS total_units_reserved,
          COALESCE(SUM(sq.on_hand * p.per_unit_cost), 0) AS total_stock_valuation
        FROM stock_quants sq
        JOIN products p ON p.id = sq.product_id
      `),

      // 4. Low Stock Alert Counter
      query(`
        SELECT COUNT(1) AS low_stock_count
        FROM (
          SELECT p.id, p.min_stock_alert, COALESCE(SUM(sq.on_hand), 0) AS current_on_hand
          FROM products p
          LEFT JOIN stock_quants sq ON p.id = sq.product_id
          GROUP BY p.id
          HAVING COALESCE(SUM(sq.on_hand), 0) <= p.min_stock_alert
        ) sub
      `),

      // 5. Recent Activity (Latest 5 moves)
      query(`
        SELECT 
          sl.id,
          sl.reference_no,
          sl.movement_type,
          sl.quantity,
          sl.created_at,
          p.name AS product_name,
          p.sku AS product_sku
        FROM stock_ledger sl
        JOIN products p ON p.id = sl.product_id
        ORDER BY sl.created_at DESC
        LIMIT 5
      `)
    ]);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        receipts: receiptsRes.rows[0],
        deliveries: deliveriesRes.rows[0],
        inventory: stockValRes.rows[0],
        alerts: {
          low_stock_items: Number(lowStockRes.rows[0]?.low_stock_count || 0)
        },
        recent_activity: recentActivity.rows
      }
    });
  } catch (err) {
    console.error('Fetch dashboard KPIs error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve dashboard metrics' });
  }
});

module.exports = router;
