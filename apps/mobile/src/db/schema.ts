// Local SQLite schema — v1 baseline for offline-first mobile.
// Tables: products, categories, sales, sale_items, sync_queue, applied_operations.
// All writes go here first; sync is a background concern.

export const LOCAL_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  category_id TEXT,
  price_per_piece REAL NOT NULL DEFAULT 0,
  price_per_pack REAL,
  cost_per_piece REAL,
  stock_pieces INTEGER NOT NULL DEFAULT 0,
  pieces_per_pack INTEGER NOT NULL DEFAULT 1,
  reorder_point_pieces INTEGER,
  unit_label TEXT,
  is_tingi INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY NOT NULL,
  branch_id TEXT NOT NULL,
  user_id TEXT,
  customer_id TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  is_utang INTEGER NOT NULL DEFAULT 0,
  utang_balance REAL,
  receipt_number TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  synced_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_receipt
  ON sales(receipt_number);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  pieces_sold INTEGER NOT NULL,
  was_sold_as TEXT NOT NULL DEFAULT 'piece',
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  barangay TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_utang REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  branch_id TEXT NOT NULL,
  type TEXT NOT NULL,
  pieces_delta INTEGER NOT NULL,
  reason TEXT,
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_operation_id TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE','DELTA')),
  payload TEXT NOT NULL,
  base_version INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  synced_at INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced
  ON sync_queue(synced_at, created_at)
  WHERE synced_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_op_id
  ON sync_queue(client_operation_id);

CREATE TABLE IF NOT EXISTS receipt_sequence (
  branch_code TEXT NOT NULL,
  cashier_code TEXT NOT NULL,
  date TEXT NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (branch_code, cashier_code, date)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`
