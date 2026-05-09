// Phase W0.7 — Audit log view.
//
// Read-only Server Component listing the most recent audit_logs entries for
// the caller's tenant. Surfaces field *names* that changed (never values) so
// owners get accountability without the page becoming a free-form PII viewer.
// See ADR-011 (immutability) + ADR-014 (diagnostics privacy).

import { getRecentAuditEntries } from '@/lib/queries/audit-log'

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

export default async function AuditLogPage() {
  const result = await getRecentAuditEntries(50)

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="m-0 text-2xl font-semibold text-ink-900">Audit log</h1>
        <p className="mt-1 text-sm text-ink-600">
          Append-only record of tenant changes. Field names only — values are not surfaced
          (ADR-014).
        </p>
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
        <article className="rounded-xl border border-ink-200 bg-white p-6 text-sm text-ink-600 shadow-sm">
          No audit entries yet. Tenant-changing actions will appear here once they happen.
        </article>
      ) : (
        <article className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
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
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[12px] text-teal-700">
                      {entry.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-700">{entry.resourceType}</td>
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
        </article>
      )}

      <p className="text-[12px] text-ink-500">
        The <code>audit_logs</code> table is server-enforced immutable; UPDATE and DELETE raise an
        exception via <code>prevent_audit_mutation</code>.
      </p>
    </div>
  )
}
