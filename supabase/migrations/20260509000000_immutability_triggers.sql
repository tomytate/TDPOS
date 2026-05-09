-- TD POS — Immutability triggers (P2.3)
-- Sales: allow only synced_at to update; block DELETE.
-- Sale items: block UPDATE and DELETE entirely.
-- Inventory logs: block UPDATE and DELETE entirely.
-- Audit logs already have an immutability trigger from the initial migration.

-- ============================================================
-- SALES — allow synced_at update only; block DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_sales_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'sales rows are immutable: DELETE not allowed';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.business_id IS DISTINCT FROM OLD.business_id
       OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_utang IS DISTINCT FROM OLD.is_utang
       OR NEW.utang_balance IS DISTINCT FROM OLD.utang_balance
       OR NEW.receipt_number IS DISTINCT FROM OLD.receipt_number
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'sales rows are immutable: only synced_at may change';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_immutability ON sales;
CREATE TRIGGER sales_immutability
  BEFORE UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION prevent_sales_mutation();

-- ============================================================
-- SALE ITEMS — block UPDATE and DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_sale_items_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'sale_items rows are immutable: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sale_items_immutability ON sale_items;
CREATE TRIGGER sale_items_immutability
  BEFORE UPDATE OR DELETE ON sale_items
  FOR EACH ROW EXECUTE FUNCTION prevent_sale_items_mutation();

-- ============================================================
-- INVENTORY LOGS — block UPDATE and DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_inventory_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inventory_logs rows are immutable: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_logs_immutability ON inventory_logs;
CREATE TRIGGER inventory_logs_immutability
  BEFORE UPDATE OR DELETE ON inventory_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_logs_mutation();
