// HQ rollup — Tier E only (`web.hq` surface). Cross-business consolidation
// for franchise / chain operators. v0.1 scaffold: all tiers see the page,
// non-Tier-E tiers see the lock banner; Tier E sees a placeholder until the
// real HQ aggregations land.

import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBusinessEntitlements } from '@/lib/queries/management'

export default async function HqPage() {
  const entitlementsResult = await getBusinessEntitlements()
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.hq') ?? false

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">HQ rollup</h1>
          <p className="mt-1 text-sm text-ink-600">
            Cross-business dashboards for franchise and chain operators.
          </p>
        </div>
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="HQ rollup"
          unlockedAt="Enterprise"
        />
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Businesses</p>
          <p className="mt-2 text-2xl font-semibold text-ink-400">--</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Aggregate row count across the franchise / chain.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Today's revenue</p>
          <p className="mt-2 text-2xl font-semibold text-ink-400">--</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Sum of completed sales across every member business, in PHT.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Sync health</p>
          <p className="mt-2 text-2xl font-semibold text-ink-400">--</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Worst-case queue depth across member businesses.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-ink-300 bg-white p-6">
        <h2 className="m-0 text-base font-semibold text-ink-900">Member businesses</h2>
        <p className="mt-1 text-sm text-ink-500">
          Per-business rows with revenue, sync status, and outstanding utang. Population deferred
          until the HQ aggregator schema lands.
        </p>
      </section>
    </div>
  )
}
