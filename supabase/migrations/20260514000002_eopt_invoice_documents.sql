-- TD POS - EOPT invoice document scaffold
--
-- Conservative RA 11976 / EOPT preparation: keep an immutable tenant-scoped
-- invoice-document snapshot for every server-side sale, without claiming
-- accreditation. The table is deliberately separate from `sales` so the
-- sales ledger stays immutable while future accreditation/submission metadata
-- can be tracked in a narrow, auditable place.

CREATE TABLE IF NOT EXISTS eopt_invoice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  receipt_id UUID REFERENCES receipts(id),
  device_id UUID REFERENCES business_devices(id),
  invoice_number TEXT NOT NULL,
  invoice_kind TEXT NOT NULL DEFAULT 'provisional'
    CHECK (invoice_kind IN ('provisional', 'invoice_format_ready', 'accredited')),
  eopt_status TEXT NOT NULL DEFAULT 'issued'
    CHECK (eopt_status IN (
      'draft',
      'issued',
      'ready_for_accreditation',
      'submitted',
      'accepted',
      'rejected',
      'voided'
    )),
  taxpayer_tin TEXT,
  registered_business_name TEXT,
  registered_address TEXT,
  branch_name TEXT,
  terminal_identifier TEXT,
  accreditation_reference TEXT,
  rejection_reason TEXT,
  document_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_eopt_invoice_documents_business_issued
  ON eopt_invoice_documents (business_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_eopt_invoice_documents_sale
  ON eopt_invoice_documents (sale_id);

CREATE INDEX IF NOT EXISTS idx_eopt_invoice_documents_status
  ON eopt_invoice_documents (business_id, eopt_status, issued_at DESC);

ALTER TABLE eopt_invoice_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eopt_invoice_documents_select ON eopt_invoice_documents;
CREATE POLICY eopt_invoice_documents_select ON eopt_invoice_documents FOR SELECT
  USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS eopt_invoice_documents_insert ON eopt_invoice_documents;
CREATE POLICY eopt_invoice_documents_insert ON eopt_invoice_documents FOR INSERT
  WITH CHECK (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS eopt_invoice_documents_update ON eopt_invoice_documents;
CREATE POLICY eopt_invoice_documents_update ON eopt_invoice_documents FOR UPDATE
  USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.prevent_eopt_invoice_identity_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'eopt_invoice_documents are immutable: DELETE not allowed';
  END IF;

  IF NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.sale_id IS DISTINCT FROM OLD.sale_id
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.invoice_kind IS DISTINCT FROM OLD.invoice_kind
     OR NEW.taxpayer_tin IS DISTINCT FROM OLD.taxpayer_tin
     OR NEW.registered_business_name IS DISTINCT FROM OLD.registered_business_name
     OR NEW.registered_address IS DISTINCT FROM OLD.registered_address
     OR NEW.branch_name IS DISTINCT FROM OLD.branch_name
     OR NEW.terminal_identifier IS DISTINCT FROM OLD.terminal_identifier
     OR NEW.document_payload IS DISTINCT FROM OLD.document_payload
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'eopt_invoice_documents identity fields are immutable';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS eopt_invoice_documents_immutability ON eopt_invoice_documents;
CREATE TRIGGER eopt_invoice_documents_immutability
  BEFORE UPDATE OR DELETE ON eopt_invoice_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_eopt_invoice_identity_mutation();

CREATE OR REPLACE FUNCTION public.create_eopt_invoice_document_for_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business businesses%ROWTYPE;
  v_branch branches%ROWTYPE;
BEGIN
  SELECT * INTO v_business FROM businesses WHERE id = NEW.business_id;
  SELECT * INTO v_branch FROM branches WHERE id = NEW.branch_id;

  INSERT INTO eopt_invoice_documents (
    business_id,
    branch_id,
    sale_id,
    invoice_number,
    invoice_kind,
    eopt_status,
    taxpayer_tin,
    registered_business_name,
    registered_address,
    branch_name,
    issued_at,
    document_payload
  )
  VALUES (
    NEW.business_id,
    NEW.branch_id,
    NEW.id,
    NEW.receipt_number,
    CASE WHEN COALESCE(v_business.eopt_accredited, false)
      THEN 'accredited'
      ELSE 'provisional'
    END,
    'issued',
    v_business.tin,
    v_business.name,
    v_business.address,
    v_branch.name,
    NEW.created_at,
    jsonb_build_object(
      'sale_id', NEW.id,
      'receipt_number', NEW.receipt_number,
      'total_amount', NEW.total_amount,
      'payment_method', NEW.payment_method,
      'status', NEW.status,
      'is_utang', NEW.is_utang,
      'created_at', NEW.created_at
    )
  )
  ON CONFLICT (business_id, invoice_number) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_create_eopt_invoice_document ON sales;
CREATE TRIGGER sales_create_eopt_invoice_document
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_eopt_invoice_document_for_sale();
