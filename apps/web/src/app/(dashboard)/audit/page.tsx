// Phase W0.7 — Audit log view. Polished for v0.9 visual QA:
// tone-aware action chip (create/update is teal, delete/erase is
// danger, others stay teal), softer empty-state card with an
// explainer about when entries appear, and a count indicator in the
// table header so owners know they're looking at the most recent 50.
//
// Read-only Server Component listing the most recent audit_logs
// entries for the caller's tenant. Surfaces field *names* that
// changed (never values) so owners get accountability without the
// page becoming a free-form PII viewer. See ADR-011 (immutability) +
// ADR-014 (diagnostics privacy).

import { TierLockBanner } from '@/components/tier-lock-banner'
import { getRecentAuditEntries } from '@/lib/queries/audit-log'
import { getBusinessEntitlements } from '@/lib/queries/management'

function changeSummary(beforeKeys: string[], afterKeys: string[]): string {
  if (beforeKeys.length === 0 && afterKeys.length === 0) return '—'
  const changed = new Set([...beforeKeys, ...afterKeys])
  return Array.from(changed).slice(0, 6).join(', ') + (changed.size > 6 ? '…' : '')
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function tailRef(value: string | null): string {
  if (!value) return '—'
  return value.length > 8 ? `…${value.slice(-8)}` : value
}

function actionToneClass(action: string): string {
  const lower = action.toLowerCase()
  if (lower.includes('delete') || lower.includes('erase') || lower.includes('void')) {
    return 'bg-danger-500/10 text-danger-600'
  }
  if (lower.includes('lost') || lower.includes('disable') || lower.includes('override')) {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-teal-50 text-teal-700'
}

export default async function AuditLogPage() {
  const entitlementsResult = await getBusinessEntitlements()
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canView = entitlements?.isSurfaceEnabled('web.audit') ?? false

  if (entitlements && !canView) {
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Audit log</h1>
          <p className="mt-1 text-sm text-ink-600">Append-only tenant accountability view.</p>
        </header>
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Audit log"
          unlockedAt="Pro"
          copy={
            <>
              Audit log access is not included on your current tier. Upgrade to{' '}
              <span className="font-semibold">Pro</span> to view tenant accountability events.
            </>
          }
        />
      </div>
    )
  }

  const result = await getRecentAuditEntries(50)
  const entriesCount = result.ready ? result.entries.length : 0

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Audit log</h1>
          <p className="mt-1 text-sm text-ink-600">
            Append-only record of tenant changes. Field names only — values are not surfaced
            (ADR-014).
          </p>
        </div>
        {result.ready && entriesCount > 0 ? (
          <span className="rounded-full bg-ink-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
            Showing latest {entriesCount}
          </span>
        ) : null}
      </header>

      {!result.ready ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700"
        >
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase environment is not configured.'
            : `Couldn’t load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : result.entries.length === 0 ? (
        <article className="rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-sm">
          <p className="m-0 text-base font-semibold text-ink-800">No audit entries yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Tenant-changing actions (product edits, role changes, module toggles, lost-device
            reports, customer erasures) appear here as they happen. Reads and ordinary sales do not.
          </p>
        </article>
      ) : (
        <article className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100 text-[13px]">
              <thead className="bg-ink-50">
                <tr className="text-left text-[11px] uppercase tracking-[1px] text-ink-500">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    When
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Resource
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Resource ID
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    User
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Changed fields
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-ink-50">
                    <td className="whitespace-nowrap px-4 py-2 text-ink-700">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[12px] ${actionToneClass(
                          entry.action,
                        )}`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-ink-700">
                      {entry.resourceType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-ink-500">
                      {tailRef(entry.resourceId)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-ink-500">
                      {tailRef(entry.userId)}
                    </td>
                    <td className="px-4 py-2 text-ink-600">
                      {changeSummary(entry.beforeKeys, entry.afterKeys)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <p className="text-[12px] text-ink-500">
        The <code>audit_logs</code> table is server-enforced immutable; UPDATE and DELETE raise an
        exception via <code>prevent_audit_mutation</code>.
      </p>
    </div>
  )
}
