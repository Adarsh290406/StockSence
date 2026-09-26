-- ============================================================================
-- StockSense - Modular Inventory Management System (IMS)
-- Database Design: Pure Relational SQL Schema
-- ============================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('inventory_manager', 'warehouse_staff')) DEFAULT 'inventory_manager',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. OTP-based Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouses (Multi-warehouse support)
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Locations (Multi-location per warehouse: Racks, Production, Vendor, Customer, Loss)
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER,
    name TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    location_type TEXT NOT NULL CHECK(location_type IN ('internal', 'vendor', 'customer', 'inventory_loss')) DEFAULT 'internal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- 5. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id INTEGER,
    uom TEXT NOT NULL DEFAULT 'Units',
    per_unit_cost REAL NOT NULL DEFAULT 0.0 CHECK(per_unit_cost >= 0),
    min_stock_alert REAL NOT NULL DEFAULT 5 CHECK(min_stock_alert >= 0),
    max_stock REAL DEFAULT NULL CHECK(max_stock IS NULL OR max_stock >= 0),
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

-- 7. Stock Quantities per Location (Tracks on_hand and reserved per product & location)
CREATE TABLE IF NOT EXISTS stock_quants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    on_hand REAL NOT NULL DEFAULT 0.0 CHECK(on_hand >= 0),
    reserved REAL NOT NULL DEFAULT 0.0 CHECK(reserved >= 0 AND reserved <= on_hand),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- 8. Operations (Receipts, Deliveries, Internal Transfers, Inventory Adjustments)
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_no TEXT UNIQUE NOT NULL,
    operation_type TEXT NOT NULL CHECK(operation_type IN ('receipt', 'delivery', 'internal', 'adjustment')),
    source_location_id INTEGER,
    dest_location_id INTEGER,
    partner_name TEXT,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'waiting', 'ready', 'done', 'canceled')) DEFAULT 'draft',
    notes TEXT,
    created_by INTEGER,
    validated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (dest_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Operation Line Items (Product demand vs completed quantity)
CREATE TABLE IF NOT EXISTS stock_move_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    demand_qty REAL NOT NULL CHECK(demand_qty > 0),
    done_qty REAL NOT NULL DEFAULT 0.0 CHECK(done_qty >= 0),
    uom TEXT NOT NULL DEFAULT 'Units',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 10. Stock Ledger / Move History (Immutable audit trail of all physical stock movements)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER,
    reference_no TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    from_location_id INTEGER,
    to_location_id INTEGER,
    quantity REAL NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('receipt', 'delivery', 'internal_transfer', 'inventory_adjustment')),
    notes TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Reordering Rules
CREATE TABLE IF NOT EXISTS reordering_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    min_qty REAL NOT NULL DEFAULT 10 CHECK(min_qty >= 0),
    max_qty REAL NOT NULL DEFAULT 100 CHECK(max_qty >= min_qty),
    auto_trigger INTEGER NOT NULL DEFAULT 1 CHECK(auto_trigger IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_lookup ON stock_quants(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(operation_type, status);
CREATE INDEX IF NOT EXISTS idx_operations_ref ON operations(reference_no);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_move_lines_op ON stock_move_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_prod ON stock_ledger(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_from_to ON stock_ledger(from_location_id, to_location_id);
