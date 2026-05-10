import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBranchManagementRows, getBusinessEntitlements } from '@/lib/queries/management'

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

export default async function BranchesPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getBranchManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.branches') ?? false

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Branches</h1>
          <p className="mt-1 text-sm text-ink-600">Store locations and active selling points.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-400"
        >
          Add branch
        </button>
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
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Total</p>
              <p className="mt-2 text-2xl font-semibold text-teal-700">{result.branches.length}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">{result.activeCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Inactive</p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">{result.inactiveCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                {entitlements?.tierShortLabel ?? 'Tier'} limit
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">
                {formatLimit(entitlements?.maxBranches ?? null)}
              </p>
            </div>
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
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={4}>
                      No branches found.
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
