---
name: postgresql-17-patterns
description: Use this skill when writing SQL migrations, RPC functions, database queries, or any Postgres-specific code. Agents hallucinate PG15/PG16 syntax and miss PG17 features. TD POS runs on PostgreSQL 17 via Supabase.
version: 1.0.0
---

# PostgreSQL 17 — SQL Patterns for TD POS

## ⚠️ COMMON HALLUCINATION WARNING

Agents may reference PG15/PG16 syntax or use extensions that are unnecessary in PG17. They also miss PG17's new JSON_TABLE function and MERGE RETURNING clause.

## PG17 Key Features Used by TD POS

### gen_random_uuid() — Built-In (No Extension)

```sql
-- ✅ PG17: gen_random_uuid() is core since PG13 — NO extension needed
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- ❌ WRONG — unnecessary extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- uuid-ossp is only needed for v1/v3/v5 UUIDs (we only use v4)
```

### JSON_TABLE — PG17 Native

Transform JSONB directly into relational rows (useful for batch sync processing):

```sql
-- PG17: query JSON arrays as relational tables
SELECT *
FROM JSON_TABLE(
  '[{"id": "abc", "delta": -1}, {"id": "def", "delta": -3}]'::jsonb,
  '$[*]' COLUMNS (
    product_id TEXT PATH '$.id',
    delta INTEGER PATH '$.delta'
  )
) AS batch;
```

### MERGE with RETURNING — PG17

Useful for upsert-and-return patterns:

```sql
-- PG17: MERGE now supports RETURNING
MERGE INTO products AS target
USING (VALUES ('abc'::uuid, 'New Name')) AS source(id, name)
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET name = source.name
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (source.id, source.name)
RETURNING target.*;
```

### Partial Indexes (Used for Sync)

```sql
-- Index only un-synced operations (small, fast)
CREATE INDEX IF NOT EXISTS idx_applied_ops_stale_in_progress
  ON applied_operations(applied_at)
  WHERE status = 'in_progress';
```

## Supabase + PG17 Configuration

```toml
# supabase/config.toml
[db]
port = 54322
major_version = 17
```

## Supabase PG17 Dropped Extensions

These extensions are NOT available on Supabase PG17:
- ❌ `timescaledb` — use native partitioning
- ❌ `plv8` — use Edge Functions instead
- ❌ `pljls` / `plcoffee` — use Edge Functions
- ❌ `pgjwt` — use Supabase Auth JWT validation

## RPC Function Best Practices (PG17)

```sql
-- Always use SECURITY DEFINER with explicit search_path
CREATE OR REPLACE FUNCTION my_rpc(p_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- PG17 safe search path enforcement
AS $$
BEGIN
  -- Tenant isolation check FIRST
  -- Then business logic
END;
$$;

-- Always grant to authenticated role only
GRANT EXECUTE ON FUNCTION my_rpc TO authenticated;
```

## ❌ DO NOT USE

```sql
-- ❌ Unnecessary extension (gen_random_uuid is core)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ❌ PG15 syntax for JSON queries (use JSON_TABLE instead for complex transforms)
SELECT * FROM jsonb_to_recordset(data) AS x(id text, value int);
-- (jsonb_to_recordset still works, but JSON_TABLE is SQL standard)

-- ❌ Dropped on Supabase PG17
CREATE EXTENSION IF NOT EXISTS "plv8";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
```

## Sources

- Postgres version: 17 (configured in `supabase/config.toml`, `[db].major_version = 17`)
- Postgres 17 release notes: <https://www.postgresql.org/docs/17/release-17.html>
- `gen_random_uuid()` reference: <https://www.postgresql.org/docs/17/functions-uuid.html>
- `JSON_TABLE` reference: <https://www.postgresql.org/docs/17/functions-json.html#FUNCTIONS-SQLJSON-TABLE>
- `MERGE` with `RETURNING`: <https://www.postgresql.org/docs/17/sql-merge.html>
- Supabase PG17 announcement: <https://supabase.com/blog/postgres-17>
- Implementation: `supabase/migrations/*.sql`
- Last verified: 2026-05-09
