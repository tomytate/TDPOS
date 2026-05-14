// Web branches management. Polished for v0.9 visual QA: shared
// MetricTile pattern with tone-aware colors, a tier-aware limit
// usage progress bar (amber at >=80%, danger at >=95%), softer
// empty state, and a status pill on every row.

import { createBranchScaffoldAction } from '@/app/(dashboard)/actions'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBranchManagementRows, getBusinessEntitlements } from '@/lib/queries/management'

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'good' | 'warn'
}) {
  const color =
    tone === 'good' ? 'text-teal-700' : tone === 'warn' ? 'text-amber-700' : 'text-ink-800'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

function LimitUsageBar({
  used,
  limit,
  tierLabel,
}: {
  used: number
  limit: number | null
  tierLabel: string
}) {
  if (limit === null) {
    return (
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
        <p className="mt-2 text-2xl font-semibold text-ink-800">Unlimited</p>
        <p className="mt-1 text-[12px] text-ink-500">No cap at this tier.</p>
      </div>
    )
  }
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100)
  const tone = pct >= 95 ? 'bg-danger-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal-600'
  const valueColor = pct >= 95 ? 'text-danger-600' : pct >= 80 ? 'text-amber-700' : 'text-teal-700'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {used.toLocaleString('en-PH')}
        <span className="text-base font-normal text-ink-500"> / {formatLimit(limit)}</span>
      </p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${used} of ${limit} branches used`}
      >
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function BranchesPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getBranchManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.branches') ?? false
  const totalBranches = result.ready ? result.branches.length : 0

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Branches</h1>
          <p className="mt-1 text-sm text-ink-600">Store locations and active selling points.</p>
        </div>
        <ScaffoldActionButton
          action={createBranchScaffoldAction}
          label="Validate branch scaffold"
          fields={[
            { kind: 'text', name: 'name', label: 'Name', placeholder: 'Main', required: true },
            { kind: 'text', name: 'region', label: 'Region', placeholder: 'NCR' },
            { kind: 'text', name: 'address', label: 'Address', placeholder: 'Quezon City' },
          ]}
        />
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Branch management"
          unlockedAt="Plus"
        />
      ) : null}

      {!result.ready ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase is not configured.'
            : `Branches could not load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <MetricTile label="Total" value={totalBranches} tone="good" />
            <MetricTile label="Active" value={result.activeCount} tone="good" />
            <MetricTile label="Inactive" value={result.inactiveCount} />
            <LimitUsageBar
              used={totalBranches}
              limit={entitlements?.maxBranches ?? null}
              tierLabel={entitlements?.tierShortLabel ?? 'Tier'}
            />
          </section>

          <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.branches.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      <p className="m-0 text-base font-semibold text-ink-800">No branches yet</p>
                      <p className="mt-1 text-sm text-ink-500">
                        Use “Validate branch scaffold” above to add your first selling point.
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-4 py-3 font-semibold text-ink-900">{branch.name}</td>
                      <td className="px-4 py-3 text-ink-600">{branch.region ?? '--'}</td>
                      <td className="px-4 py-3 text-ink-600">{branch.address ?? '--'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            branch.isActive
                              ? 'rounded-full bg-success-500/10 px-2 py-0.5 text-[12px] font-semibold text-success-600'
                              : 'rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-500'
                          }
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
