-- TD POS - Branch code scaffold
--
-- Receipt namespaces and device pairing need a short per-tenant branch code.
-- Existing branches are backfilled from their UUID tail; new branches may
-- provide a code or receive the same deterministic fallback in a trigger.

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS branch_code TEXT;

UPDATE branches
SET branch_code = UPPER(RIGHT(REPLACE(id::TEXT, '-', ''), 5))
WHERE branch_code IS NULL OR branch_code !~ '^[A-Z0-9]{3,5}$';

ALTER TABLE branches
  ALTER COLUMN branch_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branches_branch_code_format'
  ) THEN
    ALTER TABLE branches
      ADD CONSTRAINT branches_branch_code_format
      CHECK (branch_code ~ '^[A-Z0-9]{3,5}$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_business_branch_code
  ON branches (business_id, branch_code);

CREATE OR REPLACE FUNCTION public.set_branch_code_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_code IS NULL OR btrim(NEW.branch_code) = '' THEN
    NEW.branch_code := UPPER(RIGHT(REPLACE(NEW.id::TEXT, '-', ''), 5));
  ELSE
    NEW.branch_code := UPPER(REGEXP_REPLACE(NEW.branch_code, '[^A-Za-z0-9]', '', 'g'));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS branches_set_branch_code ON branches;
CREATE TRIGGER branches_set_branch_code
  BEFORE INSERT ON branches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_branch_code_before_insert();
