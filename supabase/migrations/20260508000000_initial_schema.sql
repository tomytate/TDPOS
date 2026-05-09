-- TD POS — Supabase Initial Schema (PostgreSQL 17)
-- Spec §6.4 + §6.5 (RLS) + Appendix D (race-safe RPC)
-- All tables use auth.uid() for tenant isolation
-- gen_random_uuid() is built-in since PG13 — no extension needed

-- ============================================================
-- EXTENSIONS (only what's actually needed)
-- ============================================================
-- pgcrypto is pre-installed on Supabase, needed for gen_random_bytes()
-- No UUID extension is required; gen_random_uuid() is core PostgreSQL since v13.

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  business_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tin TEXT,
  bir_rdo TEXT,
  address TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  max_branches INTEGER NOT NULL DEFAULT 1,
  eopt_accredited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_business'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_business
      FOREIGN KEY (business_id) REFERENCES businesses(id);
  END IF;
END;
$$;

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  address TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  color TEXT
);

-- ============================================================
-- PRODUCTS (canonical pieces model — §4.1.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  sku TEXT,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  price_per_piece NUMERIC NOT NULL DEFAULT 0,
  price_per_pack NUMERIC,
  cost_per_piece NUMERIC,
  stock_pieces INTEGER NOT NULL DEFAULT 0,
  pieces_per_pack INTEGER NOT NULL DEFAULT 1,
  reorder_point_pieces INTEGER,
  unit_label TEXT,
  is_tingi BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  phone TEXT,
  barangay TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_utang NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SALES (immutable — no DELETE policy)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  is_utang BOOLEAN NOT NULL DEFAULT FALSE,
  utang_balance NUMERIC,
  receipt_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE(business_id, receipt_number)
);

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  product_id UUID NOT NULL REFERENCES products(id),
  pieces_sold INTEGER NOT NULL,
  was_sold_as TEXT NOT NULL DEFAULT 'piece' CHECK(was_sold_as IN ('piece', 'pack')),
  unit_price NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL
);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  receipt_number TEXT NOT NULL,
  bir_serial TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVENTORY LOGS (append-only audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  type TEXT NOT NULL CHECK(type IN ('stock_in', 'sale', 'adjustment', 'transfer')),
  pieces_delta INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- UTANG PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS utang_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS (immutable — trigger prevents UPDATE/DELETE)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log immutability trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_immutability ON audit_logs;

CREATE TRIGGER audit_immutability
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ============================================================
-- APPLIED OPERATIONS (race-safe dedup — §6.2, Appendix D)
-- ============================================================
CREATE TABLE IF NOT EXISTS applied_operations (
  business_id UUID NOT NULL,
  client_operation_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  result JSONB,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (business_id, client_operation_id)
);

CREATE INDEX IF NOT EXISTS idx_applied_ops_recent
  ON applied_operations(business_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_applied_ops_stale_in_progress
  ON applied_operations(applied_at)
  WHERE status = 'in_progress';

-- ============================================================
-- RLS POLICIES (§6.5 — auth.uid() pattern, every table)
-- ============================================================

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = auth.uid());

-- Businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "businesses_select" ON businesses;
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  USING (id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_select" ON branches;
CREATE POLICY "branches_select" ON branches FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Sales (immutable — no DELETE policy)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Sale items (tenant via parent sale)
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Receipts (tenant via parent sale)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_select" ON receipts;
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = receipts.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = receipts.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Inventory logs
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_logs_select" ON inventory_logs;
CREATE POLICY "inv_logs_select" ON inventory_logs FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));
DROP POLICY IF EXISTS "inv_logs_insert" ON inventory_logs;
CREATE POLICY "inv_logs_insert" ON inventory_logs FOR INSERT
  WITH CHECK (branch_id IN (SELECT id FROM branches WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));

-- Payments (tenant via parent sale)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = payments.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = payments.sale_id
        AND sales.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Utang payments (tenant via parent customer)
ALTER TABLE utang_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "utang_payments_select" ON utang_payments;
CREATE POLICY "utang_payments_select" ON utang_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = utang_payments.customer_id
        AND customers.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "utang_payments_insert" ON utang_payments;
CREATE POLICY "utang_payments_insert" ON utang_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = utang_payments.customer_id
        AND customers.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- Applied operations (tenant partition; normally accessed through RPC)
ALTER TABLE applied_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applied_operations_select" ON applied_operations;
CREATE POLICY "applied_operations_select" ON applied_operations FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- RACE-SAFE INVENTORY DELTA RPC (Appendix D)
-- ============================================================
CREATE OR REPLACE FUNCTION apply_inventory_delta(
  p_client_operation_id UUID,
  p_product_id UUID,
  p_branch_id UUID,
  p_delta INTEGER,
  p_reason TEXT DEFAULT 'sale',
  p_sale_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_user_business UUID;
  v_won_race BOOLEAN := false;
  v_new_stock INTEGER;
  v_existing_status TEXT;
  v_existing_result JSONB;
  v_result JSONB;
BEGIN
  SELECT business_id INTO v_user_business FROM users WHERE id = auth.uid();
  SELECT business_id INTO v_business_id FROM products WHERE id = p_product_id;

  IF v_user_business IS NULL OR v_user_business IS DISTINCT FROM v_business_id THEN
    RAISE EXCEPTION 'tenant_violation';
  END IF;

  INSERT INTO applied_operations (business_id, client_operation_id, status, applied_at)
  VALUES (v_business_id, p_client_operation_id, 'in_progress', now())
  ON CONFLICT (business_id, client_operation_id) DO NOTHING
  RETURNING true INTO v_won_race;

  IF NOT COALESCE(v_won_race, false) THEN
    SELECT status, result INTO v_existing_status, v_existing_result
    FROM applied_operations
    WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;

    IF v_existing_status = 'completed' OR v_existing_status = 'failed' THEN
      RETURN v_existing_result || jsonb_build_object('replayed', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'concurrent_in_progress', 'retry_after_ms', 500);
    END IF;
  END IF;

  UPDATE products
    SET stock_pieces = stock_pieces + p_delta
    WHERE id = p_product_id AND stock_pieces + p_delta >= 0
    RETURNING stock_pieces INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    v_result := jsonb_build_object('ok', false, 'reason', 'insufficient_stock_or_not_found');
    UPDATE applied_operations SET status = 'failed', result = v_result, completed_at = now()
    WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;
    RETURN v_result;
  END IF;

  INSERT INTO inventory_logs(id, product_id, branch_id, type, pieces_delta, reason, user_id)
  VALUES (gen_random_uuid(), p_product_id, p_branch_id, p_reason, p_delta, p_reason, auth.uid());

  v_result := jsonb_build_object('ok', true, 'new_stock_pieces', v_new_stock);
  UPDATE applied_operations SET status = 'completed', result = v_result, completed_at = now()
  WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_inventory_delta TO authenticated;
