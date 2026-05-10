import {
  SUBSCRIPTION_TIERS,
  formatTierPrice,
  getTierDefinition,
  type ModuleName,
} from '@tdpos/shared'

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

export default function MarketingPricingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10">
      <section className="flex max-w-3xl flex-col gap-2">
        <p className="m-0 text-sm font-semibold uppercase text-teal-700">Five canonical tiers</p>
        <h1 className="m-0 text-3xl font-semibold text-ink-900">Pricing</h1>
        <p className="m-0 text-sm text-ink-600">
          Tier A is free for micro-stores. Paid tiers unlock larger counters, branch management,
          device lanes, and chain operations using the same product source of truth as the app.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const definition = getTierDefinition(tier)
          const moduleEntries = (Object.keys(definition.modules) as ModuleName[]).filter(
            (key) => definition.modules[key],
          )

          return (
            <article
              key={tier}
              className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-5"
            >
              <header>
                <p className="m-0 text-[11px] font-semibold uppercase text-teal-700">
                  {definition.shortLabel}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">{definition.publicName}</h2>
                <p className="m-0 text-[12px] text-ink-500">{definition.segment}</p>
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

              <div className="mt-auto border-t border-ink-100 pt-3">
                <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                  Included modules
                </p>
                {moduleEntries.length === 0 ? (
                  <p className="mt-1 text-[13px] text-ink-500">Core cashier only</p>
                ) : (
                  <ul className="mt-1 flex list-none flex-col gap-0.5 p-0 text-[13px] text-ink-700">
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

      <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-ink-700">
        Receipt and export language is BIR-ready for accreditation. Public claims stay provisional
        until accreditation is complete.
      </p>
    </main>
  )
}
