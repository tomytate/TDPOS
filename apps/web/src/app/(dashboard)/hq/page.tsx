// HQ rollup — Tier E only (`web.hq` surface). Polished for v0.9 visual QA:
// honest "coming with Tier E" framing for non-enterprise viewers so the
// placeholder doesn't pretend to be live data, a numbered preview of
// what HQ will surface once member-business aggregation lands, and a
// link back to /pricing for non-Tier-E viewers.
//
// Cross-business consolidation for franchise / chain operators.
// v0.1 scaffold: all tiers see the page, non-Tier-E tiers see the
// lock banner; Tier E sees a placeholder until the real HQ
// aggregations land.

import Link from 'next/link'

import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBusinessEntitlements } from '@/lib/queries/management'

const PREVIEW_ITEMS: Array<{ title: string; body: string }> = [
  {
    title: 'Member businesses',
    body: 'Every business under the same HQ owner, with health pill, revenue, and utang outstanding.',
  },
  {
    title: 'Consolidated revenue',
    body: 'Today / this week / this month rolled up across every member, with per-member breakdown.',
  },
  {
    title: 'Sync health worst-case',
    body: 'The member with the deepest queue or the oldest pending operation, surfaced first.',
  },
  {
    title: 'Cross-business audit',
    body: 'A merged audit log so HQ owners can see voids, refunds, and price overrides across the chain.',
  },
]

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
        {entitlements ? (
          <span
            className={
              canManage
                ? 'rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold uppercase text-teal-700'
                : 'rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase text-amber-700'
            }
          >
            {canManage ? 'Tier E unlocked' : 'Tier E surface'}
          </span>
        ) : null}
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="HQ rollup"
          unlockedAt="Enterprise"
        />
      ) : null}

      {/* Placeholder metric tiles — clearly marked as "no data yet" via dashed border + en-dash */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Businesses</p>
          <p className="mt-2 text-2xl font-semibold text-ink-400">--</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Aggregate row count across the franchise / chain.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Today’s revenue</p>
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

      {/* What HQ will surface */}
      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-base font-semibold text-ink-900">What HQ rollup will surface</h2>
          <span className="text-[12px] text-ink-500">Coming with Tier E aggregator schema</span>
        </div>
        <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {PREVIEW_ITEMS.map((item, index) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-lg border border-ink-100 bg-ink-50/40 p-3"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 font-mono text-[12px] font-semibold text-teal-700"
              >
                {index + 1}
              </span>
              <div>
                <p className="m-0 text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-ink-600">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Member businesses placeholder */}
      <section className="rounded-lg border border-dashed border-ink-300 bg-white p-6">
        <h2 className="m-0 text-base font-semibold text-ink-900">Member businesses</h2>
        <p className="mt-1 text-sm text-ink-500">
          Per-business rows with revenue, sync status, and outstanding utang. Population deferred
          until the HQ aggregator schema lands.
        </p>
      </section>

      {!canManage && entitlements ? (
        <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-4 text-center">
          <p className="m-0 text-sm text-ink-600">
            HQ rollup is unlocked at Tier E Enterprise. See{' '}
            <Link href="/pricing" className="font-semibold text-teal-700 hover:underline">
              pricing
            </Link>{' '}
            for a full feature comparison.
          </p>
        </div>
      ) : null}
    </div>
  )
}
