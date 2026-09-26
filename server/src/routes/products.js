const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateToken } = require('../utils/security');

/**
 * GET /api/products
 * Query Params: ?category_id=&search=
 * Returns products with aggregated on_hand, reserved, and free stock.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, search } = req.query;

    let sql = `
      SELECT 
        p.*,
        pc.name AS category_name,
        COALESCE(SUM(sq.on_hand), 0) AS total_on_hand,
        COALESCE(SUM(sq.reserved), 0) AS total_reserved,
        COALESCE(SUM(sq.on_hand - sq.reserved), 0) AS total_available
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN stock_quants sq ON p.id = sq.product_id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      params.push(category_id);
      sql += ` AND p.category_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }

    sql += ` GROUP BY p.id, pc.name ORDER BY p.name ASC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

/**
 * GET /api/products/:id
 * Fetches single product + stock breakdown per warehouse & location.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const prodRes = await query(`
      SELECT p.*, pc.name AS category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.id = $1
    `, [id]);

    const product = prodRes.rows[0];
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const stockDist = await query(`
      SELECT 
        sq.id AS quant_id,
        sq.on_hand,
        sq.reserved,
        (sq.on_hand - sq.reserved) AS available,
        l.id AS location_id,
        l.name AS location_name,
        l.location_type,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        w.short_code AS warehouse_code
      FROM stock_quants sq
      JOIN locations l ON sq.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE sq.product_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...product,
        stock_breakdown: stockDist.rows
      }
    });
  } catch (err) {
    console.error('Fetch product detail error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve product details' });
  }
});

/**
 * POST /api/products
 * Create a new product.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, sku, category_id, uom = 'Units', per_unit_cost = 0.0, min_stock_alert = 5, max_stock = null, image_url = null } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, error: 'Product name and SKU are required' });
    }

    const cleanSku = sku.trim().toUpperCase();

    const existing = await query('SELECT id FROM products WHERE sku = $1', [cleanSku]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'A product with this SKU already exists' });
    }

    const result = await query(`
      INSERT INTO products (name, sku, category_id, uom, per_unit_cost, min_stock_alert, max_stock, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      name.trim(),
      cleanSku,
      category_id || null,
      uom,
      Number(per_unit_cost),
      Number(min_stock_alert),
      max_stock ? Number(max_stock) : null,
      image_url
    ]);

    res.status(201).json({ success: true, message: 'Product created successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

/**
 * PUT /api/products/:id
 * Update product specifications.
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const current = existing.rows[0];
    const {
      name = current.name,
      sku = current.sku,
      category_id = current.category_id,
      uom = current.uom,
      per_unit_cost = current.per_unit_cost,
      min_stock_alert = current.min_stock_alert,
      max_stock = current.max_stock,
      image_url = current.image_url
    } = req.body;

    const cleanSku = sku.trim().toUpperCase();

    if (cleanSku !== current.sku) {
      const duplicate = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [cleanSku, id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'SKU is already in use by another product' });
      }
    }

    const result = await query(`
      UPDATE products
      SET name = $1, sku = $2, category_id = $3, uom = $4,
          per_unit_cost = $5, min_stock_alert = $6, max_stock = $7, image_url = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      name.trim(),
      cleanSku,
      category_id || null,
      uom,
      Number(per_unit_cost),
      Number(min_stock_alert),
      max_stock !== undefined && max_stock !== null ? Number(max_stock) : null,
      image_url,
      id
    ]);

    res.json({ success: true, message: 'Product updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 * Safe delete: verifies no active stock quantities exist.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const stockCount = await query('SELECT SUM(on_hand) AS total FROM stock_quants WHERE product_id = $1', [id]);
    const totalStock = Number(stockCount.rows[0]?.total || 0);

    if (totalStock > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete product with active inventory (${totalStock} units on hand). Perform an adjustment or transfer first.`
      });
    }

    await query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

module.exports = router;
