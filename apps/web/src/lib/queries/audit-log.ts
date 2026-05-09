// Phase W0.7 — Audit log read-only view.
//
// Reads from `audit_logs` (RLS-scoped to the caller's business). The table
// is enforced immutable at the database level by `prevent_audit_mutation`
// in the initial migration — UPDATE and DELETE always raise. So this query
// is safe to run as the owner-scoped client; the worst a misuse can do is
// see fewer rows than expected, never mutate.

import 'server-only'

import { getServerSupabase } from '@/lib/supabase/server'

export interface AuditLogEntry {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  userId: string | null
  createdAt: string
  beforeKeys: string[]
  afterKeys: string[]
}

export type AuditLogResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; entries: AuditLogEntry[] }

interface RawAuditRow {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
}

function keysOf(value: Record<string, unknown> | null): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.keys(value).sort()
}

export async function getRecentAuditEntries(limit = 50): Promise<AuditLogResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, user_id, action, resource_type, resource_id, before, after, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as RawAuditRow[]

  return {
    ready: true,
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      userId: row.user_id,
      createdAt: row.created_at,
      // Privacy-preserving: surface only the *names* of changed fields, never
      // the values themselves. Owners get accountability without us shipping
      // a free-form data viewer that bypasses the support-bundle sanitizer
      // posture (ADR-014).
      beforeKeys: keysOf(row.before),
      afterKeys: keysOf(row.after),
    })),
  }
}
