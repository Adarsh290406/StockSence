const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../utils/security');

const router = express.Router();

/**
 * GET /api/products
 * Query Params: ?category=&search=&active=1
 * Returns product list along with their total on-hand and available stock aggregated across all locations.
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { category, search, active } = req.query;

    let query = `
      SELECT 
        p.*,
        COALESCE(SUM(sq.quantity), 0) AS total_on_hand,
        COALESCE(SUM(sq.reserved_quantity), 0) AS total_reserved,
        COALESCE(SUM(sq.quantity - sq.reserved_quantity), 0) AS total_available
      FROM products p
      LEFT JOIN stock_quants sq ON p.id = sq.product_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }
    if (active !== undefined) {
      query += ` AND p.is_active = ?`;
      params.push(Number(active));
    }
    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` GROUP BY p.id ORDER BY p.name ASC`;

    const products = db.prepare(query).all(...params);
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Fetches single product details + stock breakdown per warehouse/location.
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get stock distribution across locations
    const stockDistribution = db.prepare(`
      SELECT 
        sq.id AS quant_id,
        sq.quantity,
        sq.reserved_quantity,
        (sq.quantity - sq.reserved_quantity) AS available_quantity,
        sq.lot_number,
        l.id AS location_id,
        l.name AS location_name,
        l.type AS location_type,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        w.code AS warehouse_code
      FROM stock_quants sq
      JOIN locations l ON sq.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE sq.product_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...product,
        stock_breakdown: stockDistribution
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products
 * Create a new product.
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, sku, barcode, description, category, unit_of_measure, cost_price, selling_price, min_stock_level, max_stock_level } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, error: 'Product name and SKU are required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ success: false, error: 'A product with this SKU already exists' });
    }

    const stmt = db.prepare(`
      INSERT INTO products (name, sku, barcode, description, category, unit_of_measure, cost_price, selling_price, min_stock_level, max_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      sku.trim().toUpperCase(),
      barcode ? barcode.trim() : null,
      description || null,
      category || 'General',
      unit_of_measure || 'Units',
      cost_price !== undefined ? Number(cost_price) : 0.0,
      selling_price !== undefined ? Number(selling_price) : 0.0,
      min_stock_level !== undefined ? Number(min_stock_level) : 10,
      max_stock_level !== undefined ? Number(max_stock_level) : 1000
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Update product specifications.
 */
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const {
      name = existing.name,
      sku = existing.sku,
      barcode = existing.barcode,
      description = existing.description,
      category = existing.category,
      unit_of_measure = existing.unit_of_measure,
      cost_price = existing.cost_price,
      selling_price = existing.selling_price,
      min_stock_level = existing.min_stock_level,
      max_stock_level = existing.max_stock_level,
      is_active = existing.is_active
    } = req.body;

    // Check SKU collision if SKU changed
    if (sku.toUpperCase() !== existing.sku) {
      const duplicate = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.toUpperCase(), req.params.id);
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'SKU is already in use by another product' });
      }
    }

    db.prepare(`
      UPDATE products
      SET name = ?, sku = ?, barcode = ?, description = ?, category = ?, unit_of_measure = ?,
          cost_price = ?, selling_price = ?, min_stock_level = ?, max_stock_level = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name.trim(),
      sku.trim().toUpperCase(),
      barcode ? barcode.trim() : null,
      description,
      category,
      unit_of_measure,
      Number(cost_price),
      Number(selling_price),
      Number(min_stock_level),
      Number(max_stock_level),
      Number(is_active),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Safe delete: checks if active inventory quants exist with > 0 quantity.
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const stockCount = db.prepare('SELECT SUM(quantity) AS total FROM stock_quants WHERE product_id = ?').get(req.params.id);
    if (stockCount && stockCount.total > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete product with existing stock (${stockCount.total} units). Archive it or perform an inventory adjustment first.`
      });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
