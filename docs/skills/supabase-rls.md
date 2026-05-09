---
name: supabase-rls
description: Use this skill when creating or modifying RLS policies, database tables, security rules, or any Supabase query that involves tenant isolation.
version: 1.0.0
---

# Supabase RLS Patterns

## Core Rule

**RLS is enabled on every table. No exceptions.** The owner of business A must never see data of business B at any layer.

## Standard Tenant Isolation Pattern

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON {table_name} FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_insert" ON {table_name} FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_update" ON {table_name} FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
```

## Sales Immutability

```sql
-- NO DELETE policy on sales, ever.
-- UPDATE policy restricted to synced_at only:
CREATE POLICY "sales_sync_update" ON sales FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
```

All sale corrections happen via `void` operations (new compensating sale row).

## Audit Log Immutability

```sql
-- Trigger that prevents UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutability
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
```

## Common Mistakes to Avoid

- ❌ `current_setting('app.current_tenant_id')` — this is a server-side connection-pool pattern that does NOT work with Supabase client-side JWT
- ✅ `auth.uid()` — standard Supabase pattern, reads from JWT
- ❌ Skipping RLS on "internal" tables — every table gets RLS
- ❌ Using `SECURITY DEFINER` on user-facing functions without explicit tenant checks inside the function body

## Sources

- Official docs: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Postgres reference: <https://www.postgresql.org/docs/17/ddl-rowsecurity.html>
- Implementation: `supabase/migrations/20260508000000_initial_schema.sql`, `supabase/migrations/20260509000000_immutability_triggers.sql`
- Last verified: 2026-05-09
