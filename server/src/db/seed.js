/**
 * StockSense - PostgreSQL Database Seed Script
 * Pre-populates relational sample data for demonstrations & judging evaluations.
 */
const { query, transaction, initSchema } = require('./database');
const { hashPassword } = require('../utils/security');

async function seedDatabase() {
  console.log('Synchronizing schema and seeding PostgreSQL database...');

  await initSchema();

  await transaction(async (client) => {
    // 1. Seed Users
    const managerHash = hashPassword('admin123');
    const staffHash = hashPassword('staff123');

    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Adarsh (Manager)', 'manager@stocksense.com', $1, 'inventory_manager'),
        ('Warehouse Staff', 'staff@stocksense.com', $2, 'warehouse_staff')
      ON CONFLICT (email) DO NOTHING
    `, [managerHash, staffHash]);

    // 2. Seed Warehouses
    await client.query(`
      INSERT INTO warehouses (name, short_code, address)
      VALUES 
        ('Main Warehouse', 'WH', '100 Industrial Parkway, Central Hub'),
        ('North Distribution Hub', 'NDH', '45 Logistics Way, North Port')
      ON CONFLICT (short_code) DO NOTHING
    `);

    const whRes = await client.query(`SELECT id FROM warehouses WHERE short_code = 'WH'`);
    const whId = whRes.rows[0]?.id;

    if (!whId) return;

    // 3. Seed Locations
    const locations = [
      { name: 'WH/Stock', code: 'WH-STOCK', type: 'internal' },
      { name: 'WH/Production Rack', code: 'WH-PROD', type: 'internal' },
      { name: 'WH/Output Bay', code: 'WH-OUT', type: 'internal' },
      { name: 'Vendors', code: 'VENDORS', type: 'vendor' },
      { name: 'Customers', code: 'CUSTOMERS', type: 'customer' },
      { name: 'Inventory Loss', code: 'LOSS', type: 'inventory_loss' }
    ];

    for (const loc of locations) {
      await client.query(`
        INSERT INTO locations (warehouse_id, name, short_code, location_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (short_code) DO NOTHING
      `, [whId, loc.name, loc.code, loc.type]);
    }

    const locStockRes = await client.query(`SELECT id FROM locations WHERE short_code = 'WH-STOCK'`);
    const locVendorsRes = await client.query(`SELECT id FROM locations WHERE short_code = 'VENDORS'`);
    const locCustomersRes = await client.query(`SELECT id FROM locations WHERE short_code = 'CUSTOMERS'`);

    const locStockId = locStockRes.rows[0]?.id;
    const locVendorsId = locVendorsRes.rows[0]?.id;
    const locCustomersId = locCustomersRes.rows[0]?.id;

    // 4. Seed Product Categories
    const categories = [
      { name: 'Furniture', desc: 'Office and home wooden furniture' },
      { name: 'Raw Materials', desc: 'Metals, rods, sheets, and timber' },
      { name: 'Hardware', desc: 'Bolts, frames, brackets, and fixtures' }
    ];

    for (const cat of categories) {
      await client.query(`
        INSERT INTO product_categories (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [cat.name, cat.desc]);
    }

    const catFurnRes = await client.query(`SELECT id FROM product_categories WHERE name = 'Furniture'`);
    const catRawRes = await client.query(`SELECT id FROM product_categories WHERE name = 'Raw Materials'`);

    const catFurnId = catFurnRes.rows[0]?.id;
    const catRawId = catRawRes.rows[0]?.id;

    // 5. Seed Products
    const products = [
      { name: 'Desk', sku: 'FURN-DESK-01', catId: catFurnId, uom: 'Units', cost: 3000.0, min: 10 },
      { name: 'Table', sku: 'FURN-TAB-02', catId: catFurnId, uom: 'Units', cost: 3000.0, min: 10 },
      { name: 'Steel Rods', sku: 'RAW-STL-50', catId: catRawId, uom: 'kg', cost: 250.0, min: 30 },
      { name: 'Office Chair', sku: 'FURN-CHR-03', catId: catFurnId, uom: 'Units', cost: 1200.0, min: 15 }
    ];

    for (const prod of products) {
      await client.query(`
        INSERT INTO products (name, sku, category_id, uom, per_unit_cost, min_stock_alert)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (sku) DO NOTHING
      `, [prod.name, prod.sku, prod.catId, prod.uom, prod.cost, prod.min]);
    }

    const deskRes = await client.query(`SELECT id FROM products WHERE sku = 'FURN-DESK-01'`);
    const tableRes = await client.query(`SELECT id FROM products WHERE sku = 'FURN-TAB-02'`);
    const steelRes = await client.query(`SELECT id FROM products WHERE sku = 'RAW-STL-50'`);
    const chairRes = await client.query(`SELECT id FROM products WHERE sku = 'FURN-CHR-03'`);

    const deskId = deskRes.rows[0]?.id;
    const tableId = tableRes.rows[0]?.id;
    const steelId = steelRes.rows[0]?.id;
    const chairId = chairRes.rows[0]?.id;

    // 6. Seed Stock Quants
    if (locStockId && deskId && tableId && steelId && chairId) {
      const quants = [
        { prodId: deskId, onHand: 50.0, reserved: 5.0 },
        { prodId: tableId, onHand: 50.0, reserved: 0.0 },
        { prodId: steelId, onHand: 100.0, reserved: 0.0 },
        { prodId: chairId, onHand: 8.0, reserved: 0.0 }
      ];

      for (const q of quants) {
        await client.query(`
          INSERT INTO stock_quants (product_id, location_id, on_hand, reserved)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (product_id, location_id) 
          DO UPDATE SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved, updated_at = CURRENT_TIMESTAMP
        `, [q.prodId, locStockId, q.onHand, q.reserved]);
      }
    }

    // 7. Seed Sample Operations (Receipts & Deliveries)
    const pastDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    if (locVendorsId && locStockId && steelId) {
      const op1 = await client.query(`
        INSERT INTO operations (reference_no, operation_type, source_location_id, dest_location_id, partner_name, scheduled_date, status, notes)
        VALUES ('WH/IN/0001', 'receipt', $1, $2, 'Apex Metals Corp', $3, 'ready', 'Urgent batch for production')
        ON CONFLICT (reference_no) DO NOTHING
        RETURNING id
      `, [locVendorsId, locStockId, pastDate]);

      const op1Id = op1.rows[0]?.id;
      if (op1Id) {
        await client.query(`
          INSERT INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom)
          VALUES ($1, $2, 50.0, 0.0, 'kg')
        `, [op1Id, steelId]);
      }
    }

    if (locStockId && locCustomersId && deskId) {
      const op2 = await client.query(`
        INSERT INTO operations (reference_no, operation_type, source_location_id, dest_location_id, partner_name, scheduled_date, status, notes)
        VALUES ('WH/OUT/0001', 'delivery', $1, $2, 'Acme Corp Offices', $3, 'ready', 'Deliver 5 executive desks')
        ON CONFLICT (reference_no) DO NOTHING
        RETURNING id
      `, [locStockId, locCustomersId, pastDate]);

      const op2Id = op2.rows[0]?.id;
      if (op2Id) {
        await client.query(`
          INSERT INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom)
          VALUES ($1, $2, 5.0, 0.0, 'Units')
        `, [op2Id, deskId]);
      }
    }
  });

  console.log('✓ StockSense PostgreSQL database seeded successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
