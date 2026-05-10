// Marketing pricing page — public surface (`marketing.pricing` in
// TIER_DEFINITIONS). Renders the canonical 5 tiers from `@tdpos/shared`
// so price/feature copy is single-sourced. Visible whether signed-in or
// not; signed-in users get a "Current tier" badge on their row.

import Link from 'next/link'

import {
  SUBSCRIPTION_TIERS,
  formatTierPrice,
  getTierDefinition,
  type ModuleName,
} from '@tdpos/shared'

import { getBusinessEntitlements } from '@/lib/queries/management'

const MODULE_LABELS: Record<ModuleName, string> = {
  utang: 'Utang ledger',
  customer_sms: 'Customer SMS',
  loyalty: 'Loyalty',
  supplier_management: 'Supplier management',
  multi_branch: 'Multi-branch',
  franchise_management: 'Franchise management',
  payroll: 'Payroll',
  accounting_integration: 'Accounting integration',
  public_api: 'Public API',
}

function formatLimit(limit: number | null, suffix: string): string {
  return limit === null ? `Unlimited ${suffix}` : `${limit.toLocaleString('en-PH')} ${suffix}`
}

export default async function PricingPage() {
  // Best-effort: signed-in users get a tier badge on their row. Unauthed
  // (or supabase-unconfigured) renders fall back to no badge.
  const entitlementsResult = await getBusinessEntitlements()
  const currentTier = entitlementsResult.ready ? entitlementsResult.entitlements.tier : null

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-700 px-6 py-3 text-white">
        <Link href="/" className="text-base font-semibold text-white">
          TD POS
        </Link>
        <nav className="flex items-center gap-3 text-[13px]" aria-label="Marketing">
          <Link
            href="/pricing"
            className="rounded-md bg-white/10 px-2.5 py-1 text-white"
            aria-current="page"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/40 bg-transparent px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <section className="mb-6 flex flex-col gap-2">
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Pricing</h1>
          <p className="m-0 text-sm text-ink-600">
            Five canonical tiers. Tier A is free forever for solo cashiers.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const definition = getTierDefinition(tier)
            const isCurrent = currentTier === tier
            const moduleEntries = (Object.keys(definition.modules) as ModuleName[]).filter(
              (key) => definition.modules[key],
            )

            return (
              <article
                key={tier}
                className={
                  isCurrent
                    ? 'flex flex-col gap-3 rounded-lg border-2 border-teal-700 bg-white p-5 shadow-sm'
                    : 'flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-5'
                }
                aria-current={isCurrent ? 'true' : undefined}
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                      {definition.shortLabel}
                    </p>
                    <h2 className="m-0 text-lg font-semibold text-ink-900">{definition.label}</h2>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                      Current
                    </span>
                  ) : null}
                </header>

                <p className="m-0 text-base font-semibold text-ink-900">
                  {formatTierPrice(definition.pricePhpMonthly)}
                </p>

                <p className="m-0 text-sm text-ink-600">{definition.description}</p>

                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-ink-700">
                  <li>{formatLimit(definition.maxProducts, 'products')}</li>
                  <li>{formatLimit(definition.maxBranches, 'branches')}</li>
                  <li>{formatLimit(definition.maxDevices, 'devices')}</li>
                  <li>{formatLimit(definition.maxUsers, 'users')}</li>
                </ul>

                <div className="mt-auto flex flex-col gap-1.5 border-t border-ink-100 pt-3">
                  <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                    Modules included
                  </p>
                  {moduleEntries.length === 0 ? (
                    <p className="m-0 text-[13px] text-ink-500">Core only</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[13px] text-ink-700">
                      {moduleEntries.map((key) => (
                        <li key={key}>{MODULE_LABELS[key]}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            )
          })}
        </section>

        <footer className="mt-10 text-center text-[12px] text-ink-500">
          BIR-ready provisional cashier formats. BIR accreditation pending.
        </footer>
      </main>
    </div>
  )
}
