/**
 * StockSense - Database Seed Script
 * Pre-populates data matching the Excalidraw wireframe and problem statement.
 */
const { db, run, queryOne, transaction } = require('./database');
const { hashPassword } = require('../utils/security');

function seedDatabase() {
    console.log('Seeding StockSense relational SQL database...');

    transaction(({ run, queryOne }) => {
        // 1. Seed Users
        const managerHash = hashPassword('admin123');
        const staffHash = hashPassword('staff123');

        run(`INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES 
            (?, ?, ?, ?),
            (?, ?, ?, ?)`,
            [
                'Adarsh (Manager)', 'manager@stocksense.com', managerHash, 'inventory_manager',
                'Warehouse Staff', 'staff@stocksense.com', staffHash, 'warehouse_staff'
            ]
        );

        // 2. Seed Warehouse
        run(`INSERT OR IGNORE INTO warehouses (name, short_code, address) VALUES
            ('Main Warehouse', 'WH', '100 Industrial Parkway, Central Hub'),
            ('North Distribution Hub', 'NDH', '45 Logistics Way, North Port')`
        );

        const wh = queryOne(`SELECT id FROM warehouses WHERE short_code = 'WH'`);

        // 3. Seed Locations
        run(`INSERT OR IGNORE INTO locations (warehouse_id, name, short_code, location_type) VALUES
            (?, 'WH/Stock', 'WH-STOCK', 'internal'),
            (?, 'WH/Production Rack', 'WH-PROD', 'internal'),
            (?, 'WH/Output Bay', 'WH-OUT', 'internal'),
            (?, 'Vendors', 'VENDORS', 'vendor'),
            (?, 'Customers', 'CUSTOMERS', 'customer'),
            (?, 'Inventory Loss', 'LOSS', 'inventory_loss')`,
            [wh.id, wh.id, wh.id, wh.id, wh.id, wh.id]
        );

        const locStock = queryOne(`SELECT id FROM locations WHERE short_code = 'WH-STOCK'`);
        const locProd = queryOne(`SELECT id FROM locations WHERE short_code = 'WH-PROD'`);
        const locVendors = queryOne(`SELECT id FROM locations WHERE short_code = 'VENDORS'`);
        const locCustomers = queryOne(`SELECT id FROM locations WHERE short_code = 'CUSTOMERS'`);

        // 4. Seed Categories
        run(`INSERT OR IGNORE INTO product_categories (name, description) VALUES
            ('Furniture', 'Office and home wooden furniture'),
            ('Raw Materials', 'Metals, rods, sheets, and timber'),
            ('Hardware', 'Bolts, frames, brackets, and fixtures')`
        );

        const catFurn = queryOne(`SELECT id FROM product_categories WHERE name = 'Furniture'`);
        const catRaw = queryOne(`SELECT id FROM product_categories WHERE name = 'Raw Materials'`);

        // 5. Seed Products (matching Excalidraw: Desk, Table, Steel Rods, Chairs)
        run(`INSERT OR IGNORE INTO products (name, sku, category_id, uom, per_unit_cost, min_stock_alert) VALUES
            ('Desk', 'FURN-DESK-01', ?, 'Units', 3000.0, 10),
            ('Table', 'FURN-TAB-02', ?, 'Units', 3000.0, 10),
            ('Steel Rods', 'RAW-STL-50', ?, 'kg', 250.0, 30),
            ('Office Chair', 'FURN-CHR-03', ?, 'Units', 1200.0, 15)`,
            [catFurn.id, catFurn.id, catRaw.id, catFurn.id]
        );

        const desk = queryOne(`SELECT id FROM products WHERE sku = 'FURN-DESK-01'`);
        const table = queryOne(`SELECT id FROM products WHERE sku = 'FURN-TAB-02'`);
        const steel = queryOne(`SELECT id FROM products WHERE sku = 'RAW-STL-50'`);
        const chair = queryOne(`SELECT id FROM products WHERE sku = 'FURN-CHR-03'`);

        // 6. Seed Stock Levels in WH/Stock (Desk: 50 on hand / 5 reserved -> 45 free to use, Table: 50 on hand / 0 reserved)
        run(`INSERT OR REPLACE INTO stock_quants (product_id, location_id, on_hand, reserved) VALUES
            (?, ?, 50.0, 5.0),
            (?, ?, 50.0, 0.0),
            (?, ?, 100.0, 0.0),
            (?, ?, 8.0, 0.0)`,
            [
                desk.id, locStock.id,
                table.id, locStock.id,
                steel.id, locStock.id,
                chair.id, locStock.id
            ]
        );

        // 7. Seed Operations: Receipts (WH/IN/0001, WH/IN/0002)
        const pastDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]; // Late date
        const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

        run(`INSERT OR IGNORE INTO operations (reference_no, operation_type, source_location_id, dest_location_id, partner_name, scheduled_date, status, notes) VALUES
            ('WH/IN/0001', 'receipt', ?, ?, 'Apex Metals Corp', ?, 'ready', 'Urgent batch for production'),
            ('WH/IN/0002', 'receipt', ?, ?, 'Global Furnishings Ltd', ?, 'draft', 'Standard restock order')`,
            [locVendors.id, locStock.id, pastDate, locVendors.id, locStock.id, futureDate]
        );

        const opRec1 = queryOne(`SELECT id FROM operations WHERE reference_no = 'WH/IN/0001'`);
        if (opRec1) {
            run(`INSERT OR IGNORE INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom) VALUES
                (?, ?, 50.0, 0.0, 'kg')`,
                [opRec1.id, steel.id]
            );
        }

        // 8. Seed Operations: Deliveries (WH/OUT/0001, WH/OUT/0002)
        run(`INSERT OR IGNORE INTO operations (reference_no, operation_type, source_location_id, dest_location_id, partner_name, scheduled_date, status, notes) VALUES
            ('WH/OUT/0001', 'delivery', ?, ?, 'Acme Corp Offices', ?, 'ready', 'Deliver 5 executive desks'),
            ('WH/OUT/0002', 'delivery', ?, ?, 'Zenith Workspaces', ?, 'waiting', 'Waiting for chairs stock replenishment')`,
            [locStock.id, locCustomers.id, pastDate, locStock.id, locCustomers.id, futureDate]
        );

        const opDel1 = queryOne(`SELECT id FROM operations WHERE reference_no = 'WH/OUT/0001'`);
        if (opDel1) {
            run(`INSERT OR IGNORE INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom) VALUES
                (?, ?, 5.0, 0.0, 'Units')`,
                [opDel1.id, desk.id]
            );
        }

        const opDel2 = queryOne(`SELECT id FROM operations WHERE reference_no = 'WH/OUT/0002'`);
        if (opDel2) {
            run(`INSERT OR IGNORE INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty, uom) VALUES
                (?, ?, 20.0, 0.0, 'Units')`,
                [opDel2.id, chair.id]
            );
        }

        // 9. Seed Initial Stock Ledger Entry
        run(`INSERT OR IGNORE INTO stock_ledger (reference_no, product_id, from_location_id, to_location_id, quantity, movement_type, notes) VALUES
            ('INIT-STOCK', ?, NULL, ?, 50.0, 'receipt', 'Initial inventory setup'),
            ('INIT-STOCK', ?, NULL, ?, 50.0, 'receipt', 'Initial inventory setup'),
            ('INIT-STOCK', ?, NULL, ?, 100.0, 'receipt', 'Initial inventory setup')`,
            [desk.id, locStock.id, table.id, locStock.id, steel.id, locStock.id]
        );

        // 10. Seed Reordering Rules
        run(`INSERT OR REPLACE INTO reordering_rules (product_id, location_id, min_qty, max_qty, auto_trigger) VALUES
            (?, ?, 10.0, 100.0, 1),
            (?, ?, 15.0, 80.0, 1)`,
            [desk.id, locStock.id, chair.id, locStock.id]
        );
    });

    console.log('StockSense database seeded successfully!');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
