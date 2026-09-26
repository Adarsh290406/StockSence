/**
 * StockSense - Operations Management Routes (PostgreSQL)
 * Implements Receipts (Vendor -> Internal), Deliveries (Internal -> Customer),
 * Internal Transfers (Location -> Location), and Stock Adjustments.
 * 
 * Includes transactional validation and automatic immutable ledger recording.
 */
const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/database');
const { authenticateUser } = require('./auth');

// Apply authentication to all operation routes
router.use(authenticateUser);

/**
 * Generate Next Reference Number for operations
 * Example: 'WH/IN/0001', 'WH/OUT/0001', 'WH/INT/0001', 'WH/ADJ/0001'
 */
async function generateReferenceNo(client, operationType, warehouseCode = 'WH') {
  const prefixMap = {
    receipt: `${warehouseCode}/IN/`,
    delivery: `${warehouseCode}/OUT/`,
    internal: `${warehouseCode}/INT/`,
    adjustment: `${warehouseCode}/ADJ/`
  };

  const prefix = prefixMap[operationType] || `${warehouseCode}/OP/`;
  const res = await client.query(
    `SELECT reference_no FROM operations WHERE reference_no LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  if (res.rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastRef = res.rows[0].reference_no;
  const lastNum = parseInt(lastRef.replace(prefix, ''), 10) || 0;
  const nextNum = String(lastNum + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}

/**
 * GET /api/operations
 * Query Params: ?type=receipt|delivery|internal|adjustment & status=draft|waiting|ready|done|canceled & search=
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, search } = req.query;

    let sql = `
      SELECT 
        o.id,
        o.reference_no,
        o.operation_type,
        o.partner_name,
        o.scheduled_date,
        o.status,
        o.notes,
        o.validated_at,
        o.created_at,
        sl.name AS source_location_name,
        sl.short_code AS source_location_code,
        dl.name AS dest_location_name,
        dl.short_code AS dest_location_code,
        u.name AS created_by_name,
        COUNT(sml.id) AS item_count,
        COALESCE(SUM(sml.demand_qty), 0) AS total_demand_qty,
        COALESCE(SUM(sml.done_qty), 0) AS total_done_qty
      FROM operations o
      LEFT JOIN locations sl ON sl.id = o.source_location_id
      LEFT JOIN locations dl ON dl.id = o.dest_location_id
      LEFT JOIN users u ON u.id = o.created_by
      LEFT JOIN stock_move_lines sml ON sml.operation_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      params.push(type);
      sql += ` AND o.operation_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (o.reference_no ILIKE $${params.length} OR o.partner_name ILIKE $${params.length})`;
    }

    sql += ` GROUP BY o.id, sl.name, sl.short_code, dl.name, dl.short_code, u.name ORDER BY o.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('Fetch operations error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve operations' });
  }
});

/**
 * GET /api/operations/:id
 * Retrieve operation detail + all move line items
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const opRes = await query(`
      SELECT 
        o.*,
        sl.name AS source_location_name,
        sl.short_code AS source_location_code,
        dl.name AS dest_location_name,
        dl.short_code AS dest_location_code,
        u.name AS created_by_name
      FROM operations o
      LEFT JOIN locations sl ON sl.id = o.source_location_id
      LEFT JOIN locations dl ON dl.id = o.dest_location_id
      LEFT JOIN users u ON u.id = o.created_by
      WHERE o.id = $1
    `, [id]);

    const operation = opRes.rows[0];
    if (!operation) {
      return res.status(404).json({ success: false, error: 'Operation record not found' });
    }

    const linesRes = await query(`
      SELECT 
        sml.*,
        p.name AS product_name,
        p.sku AS product_sku,
        COALESCE(sq.on_hand, 0) AS current_source_on_hand,
        COALESCE(sq.reserved, 0) AS current_source_reserved
      FROM stock_move_lines sml
      JOIN products p ON p.id = sml.product_id
      LEFT JOIN stock_quants sq ON sq.product_id = sml.product_id AND sq.location_id = $2
      WHERE sml.operation_id = $1
    `, [id, operation.source_location_id || 0]);

    return res.json({
      success: true,
      data: {
        ...operation,
        items: linesRes.rows
      }
    });
  } catch (err) {
    console.error('Fetch operation detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve operation details' });
  }
});

/**
 * POST /api/operations
 * Create a new operation (Receipt, Delivery, Internal Transfer, Adjustment) with line items
 */
router.post('/', async (req, res) => {
  try {
    const {
      operation_type,
      source_location_id,
      dest_location_id,
      partner_name,
      scheduled_date = new Date().toISOString().split('T')[0],
      notes = '',
      items = []
    } = req.body;

    const validTypes = ['receipt', 'delivery', 'internal', 'adjustment'];
    if (!validTypes.includes(operation_type)) {
      return res.status(400).json({ success: false, error: `Invalid operation type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one product item line is required' });
    }

    const result = await transaction(async (client) => {
      // 1. Generate reference code
      const referenceNo = await generateReferenceNo(client, operation_type);

      // 2. Insert master operation record
      const initialStatus = operation_type === 'receipt' ? 'draft' : 'waiting';

      const opInsert = await client.query(`
        INSERT INTO operations (
          reference_no, operation_type, source_location_id, dest_location_id,
          partner_name, scheduled_date, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        referenceNo,
        operation_type,
        source_location_id || null,
        dest_location_id || null,
        partner_name || null,
        scheduled_date,
        initialStatus,
        notes,
        req.user.id
      ]);

      const createdOp = opInsert.rows[0];

      // 3. Insert line items
      for (const item of items) {
        if (!item.product_id || !item.demand_qty || Number(item.demand_qty) <= 0) {
          throw new Error('Each item must specify a valid product_id and demand_qty > 0');
        }

        await client.query(`
          INSERT INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          createdOp.id,
          item.product_id,
          Number(item.demand_qty),
          Number(item.done_qty || 0),
          item.uom || 'Units'
        ]);
      }

      return createdOp;
    });

    return res.status(201).json({
      success: true,
      message: `${result.operation_type.toUpperCase()} operation created successfully with reference ${result.reference_no}`,
      data: result
    });
  } catch (err) {
    console.error('Create operation error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/operations/:id/validate
 * Validates and finalizes an operation (Receipt or Delivery or Transfer)
 * Executes atomic stock transfer + writes immutable stock_ledger audit entries.
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;

    const validatedResult = await transaction(async (client) => {
      // 1. Fetch operation
      const opRes = await client.query('SELECT * FROM operations WHERE id = $1 FOR UPDATE', [id]);
      const op = opRes.rows[0];

      if (!op) {
        throw new Error('Operation not found');
      }

      if (op.status === 'done') {
        throw new Error('This operation has already been validated and finalized');
      }

      if (op.status === 'canceled') {
        throw new Error('Cannot validate a canceled operation');
      }

      // 2. Fetch move lines
      const linesRes = await client.query('SELECT * FROM stock_move_lines WHERE operation_id = $1', [id]);
      const lines = linesRes.rows;

      if (lines.length === 0) {
        throw new Error('Operation has no move lines to process');
      }

      // 3. Process stock adjustments for each line item
      for (const line of lines) {
        const qtyToTransfer = line.done_qty > 0 ? Number(line.done_qty) : Number(line.demand_qty);

        // If source location exists (Outgoing delivery, transfer, adjustment)
        if (op.source_location_id) {
          const sourceQuant = await client.query(`
            SELECT * FROM stock_quants 
            WHERE product_id = $1 AND location_id = $2
            FOR UPDATE
          `, [line.product_id, op.source_location_id]);

          const currentStock = sourceQuant.rows[0];
          const available = currentStock ? Number(currentStock.on_hand) : 0;

          // Vendor receipts don't deduct stock, but internal/delivery does
          if (op.operation_type !== 'receipt' && available < qtyToTransfer) {
            throw new Error(`Insufficient stock in source location for product ID ${line.product_id}. Available: ${available}, Required: ${qtyToTransfer}`);
          }

          if (currentStock) {
            await client.query(`
              UPDATE stock_quants 
              SET on_hand = on_hand - $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [qtyToTransfer, currentStock.id]);
          }
        }

        // If destination location exists (Incoming receipt, transfer, adjustment)
        if (op.dest_location_id) {
          await client.query(`
            INSERT INTO stock_quants (product_id, location_id, on_hand, reserved)
            VALUES ($1, $2, $3, 0)
            ON CONFLICT (product_id, location_id)
            DO UPDATE SET on_hand = stock_quants.on_hand + $3, updated_at = CURRENT_TIMESTAMP
          `, [line.product_id, op.dest_location_id, qtyToTransfer]);
        }

        // Update done_qty on move line
        await client.query(`
          UPDATE stock_move_lines SET done_qty = $1 WHERE id = $2
        `, [qtyToTransfer, line.id]);

        // 4. Record Immutable Stock Ledger Entry (Audit Trail)
        const moveTypeMap = {
          receipt: 'receipt',
          delivery: 'delivery',
          internal: 'internal_transfer',
          adjustment: 'inventory_adjustment'
        };

        await client.query(`
          INSERT INTO stock_ledger (
            operation_id, reference_no, product_id, from_location_id,
            to_location_id, quantity, movement_type, notes, user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          op.id,
          op.reference_no,
          line.product_id,
          op.source_location_id || null,
          op.dest_location_id || null,
          qtyToTransfer,
          moveTypeMap[op.operation_type] || 'internal_transfer',
          op.notes || `Validated ${op.operation_type} ${op.reference_no}`,
          req.user.id
        ]);
      }

      // 5. Update operation status to 'done'
      const updatedOp = await client.query(`
        UPDATE operations 
        SET status = 'done', validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);

      return updatedOp.rows[0];
    });

    return res.json({
      success: true,
      message: `Operation ${validatedResult.reference_no} validated and finalized. Stock updated.`,
      data: validatedResult
    });
  } catch (err) {
    console.error('Validate operation error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/operations/:id/cancel
 * Cancel an operation if not yet completed
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const op = await query('SELECT * FROM operations WHERE id = $1', [id]);
    if (op.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Operation not found' });
    }

    if (op.rows[0].status === 'done') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an operation that has already been validated' });
    }

    const updated = await query(`
      UPDATE operations 
      SET status = 'canceled', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `, [id]);

    return res.json({ success: true, message: 'Operation canceled', data: updated.rows[0] });
  } catch (err) {
    console.error('Cancel operation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel operation' });
  }
});

module.exports = router;
