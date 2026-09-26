const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateUser } = require('./auth');

// Apply authentication to all product routes
router.use(authenticateUser);

/**
 * GET /api/products
 * Query Params: ?category_id=&search=
 * Returns products with aggregated on_hand, reserved, and free stock.
 */
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
 * POST /api/products/:id/adjust
 * Direct stock adjustment for a product at default/main warehouse location
 */
router.post('/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_on_hand, location_id } = req.body;

    if (new_on_hand === undefined || isNaN(Number(new_on_hand)) || Number(new_on_hand) < 0) {
      return res.status(400).json({ success: false, error: 'Valid new_on_hand quantity >= 0 is required' });
    }

    const prodRes = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const product = prodRes.rows[0];

    // Find target location or default to first internal stock location
    let targetLocId = location_id;
    if (!targetLocId) {
      const locRes = await query(`SELECT id FROM locations WHERE location_type = 'internal' ORDER BY id ASC LIMIT 1`);
      if (locRes.rows.length > 0) {
        targetLocId = locRes.rows[0].id;
      } else {
        const anyLoc = await query('SELECT id FROM locations ORDER BY id ASC LIMIT 1');
        targetLocId = anyLoc.rows[0]?.id;
      }
    }

    if (!targetLocId) {
      return res.status(400).json({ success: false, error: 'No warehouse location found to assign stock' });
    }

    // Read current on_hand
    const currentQuantRes = await query('SELECT on_hand FROM stock_quants WHERE product_id = $1 AND location_id = $2', [id, targetLocId]);
    const prevOnHand = Number(currentQuantRes.rows[0]?.on_hand || 0);
    const targetQty = Number(new_on_hand);
    const diff = targetQty - prevOnHand;

    // Upsert quant
    await query(`
      INSERT INTO stock_quants (product_id, location_id, on_hand, reserved)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (product_id, location_id)
      DO UPDATE SET on_hand = $3, updated_at = CURRENT_TIMESTAMP
    `, [id, targetLocId, targetQty]);

    // Record in stock_ledger
    if (diff !== 0) {
      const refNo = `ADJ/${new Date().getFullYear()}/${String(Date.now()).slice(-4)}`;
      await query(`
        INSERT INTO stock_ledger (
          reference_no, product_id, from_location_id, to_location_id,
          quantity, movement_type, notes, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        refNo,
        id,
        diff < 0 ? targetLocId : null,
        diff > 0 ? targetLocId : null,
        Math.abs(diff),
        'inventory_adjustment',
        `Stock manual adjustment from ${prevOnHand} to ${targetQty}`,
        req.user.id
      ]);
    }

    return res.json({
      success: true,
      message: `Stock updated to ${targetQty} ${product.uom}`,
      data: { product_id: id, on_hand: targetQty }
    });
  } catch (err) {
    console.error('Adjust stock error:', err);
    return res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

module.exports = router;
