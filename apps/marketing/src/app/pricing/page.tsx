// Marketing pricing. Polished for v0.9 visual QA: aligns the public
// pricing surface with the in-app dashboard /pricing — same Tier B
// "Most popular" ribbon, per-tier CTA buttons (Start free vs Talk to
// us vs Request a demo), feature comparison matrix, and the same
// four-question FAQ. Single source of truth for both pages is
// SUBSCRIPTION_TIERS + getTierDefinition from @tdpos/shared.

import Link from 'next/link'

import {
  SUBSCRIPTION_TIERS,
  formatTierPrice,
  getTierDefinition,
  type ModuleName,
  type SubscriptionTier,
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

const ALL_MODULES: ModuleName[] = [
  'utang',
  'customer_sms',
  'loyalty',
  'supplier_management',
  'multi_branch',
  'franchise_management',
  'payroll',
  'accounting_integration',
  'public_api',
]

const HIGHLIGHT_TIER: SubscriptionTier = 'tier_b_pro'

function formatLimit(limit: number | null, suffix: string): string {
  return limit === null ? `Unlimited ${suffix}` : `${limit.toLocaleString('en-PH')} ${suffix}`
}

function tierCta(tier: SubscriptionTier): { label: string; href: string; primary: boolean } {
  switch (tier) {
    case 'tier_a_free':
      return { label: 'Start free', href: '/pricing', primary: true }
    case 'tier_b_pro':
    case 'tier_c_plus':
      return {
        label: 'Talk to us',
        href: 'mailto:hello@tdpos.app?subject=Pilot%20interest',
        primary: true,
      }
    case 'tier_d_premium':
    case 'tier_e_enterprise':
      return {
        label: 'Request a demo',
        href: 'mailto:hello@tdpos.app?subject=Enterprise%20demo',
        primary: false,
      }
  }
}

function CheckGlyph({ on, srLabel }: { on: boolean; srLabel: string }) {
  return (
    <span
      aria-label={srLabel}
      className={
        on
          ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700'
          : 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-ink-400'
      }
    >
      {on ? (
        <svg
          aria-hidden="true"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span aria-hidden="true" className="text-[14px] leading-none">
          ·
        </span>
      )}
    </span>
  )
}

export default function MarketingPricingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10">
      {/* Hero */}
      <section className="flex max-w-3xl flex-col items-start gap-3">
        <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
          Tama ang stock mo. Lagi.
        </span>
        <h1 className="m-0 text-3xl font-semibold text-ink-900 sm:text-4xl">Pricing</h1>
        <p className="m-0 text-sm text-ink-600 sm:text-base">
          Five canonical tiers. Tier A is free forever for solo cashiers; paid tiers unlock
          multi-cashier, multi-branch, and enterprise workflows. No setup fee, cancel anytime.
        </p>
      </section>

      {/* Tier cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const definition = getTierDefinition(tier)
          const isHighlight = tier === HIGHLIGHT_TIER
          const moduleEntries = (Object.keys(definition.modules) as ModuleName[]).filter(
            (key) => definition.modules[key],
          )
          const cta = tierCta(tier)

          return (
            <article
              key={tier}
              className={[
                'relative flex flex-col gap-3 rounded-lg bg-white p-5',
                isHighlight ? 'border-2 border-teal-500 shadow-md' : 'border border-ink-200',
              ].join(' ')}
            >
              {isHighlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-700 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Most popular
                </span>
              ) : null}

              <header>
                <p className="m-0 text-[11px] font-semibold uppercase text-teal-700">
                  {definition.shortLabel}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">{definition.publicName}</h2>
                <p className="m-0 text-[12px] text-ink-500">{definition.segment}</p>
              </header>

              <p className="m-0 text-2xl font-semibold text-ink-900">
                {formatTierPrice(definition.pricePhpMonthly)}
              </p>
              <p className="m-0 text-sm text-ink-600">{definition.description}</p>

              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-ink-700">
                <li>{formatLimit(definition.maxProducts, 'products')}</li>
                <li>{formatLimit(definition.maxBranches, 'branches')}</li>
                <li>{formatLimit(definition.maxDevices, 'devices')}</li>
                <li>{formatLimit(definition.maxUsers, 'users')}</li>
              </ul>

              <div className="border-t border-ink-100 pt-3">
                <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                  Included modules
                </p>
                {moduleEntries.length === 0 ? (
                  <p className="mt-1 text-[13px] text-ink-500">Core cashier only</p>
                ) : (
                  <ul className="mt-1 flex list-none flex-col gap-0.5 p-0 text-[13px] text-ink-700">
                    {moduleEntries.map((key) => (
                      <li key={key} className="flex items-center gap-1.5">
                        <CheckGlyph on srLabel="Included" />
                        {MODULE_LABELS[key]}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-auto pt-3">
                <Link
                  href={cta.href}
                  className={[
                    'inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-[13px] font-semibold transition-colors',
                    cta.primary
                      ? 'bg-teal-700 text-white hover:bg-teal-800'
                      : 'border border-ink-300 bg-white text-ink-800 hover:bg-ink-50',
                  ].join(' ')}
                >
                  {cta.label}
                </Link>
              </div>
            </article>
          )
        })}
      </section>

      {/* Feature comparison matrix */}
      <section className="mt-2">
        <h2 className="m-0 mb-4 text-xl font-semibold text-ink-900">Compare modules</h2>
        <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-ink-50">
                <th className="border-b border-ink-200 px-3 py-2 text-left font-semibold text-ink-700">
                  Module
                </th>
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const def = getTierDefinition(tier)
                  return (
                    <th
                      key={tier}
                      className="border-b border-ink-200 px-3 py-2 text-center font-semibold text-ink-700"
                    >
                      {def.shortLabel}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((moduleKey) => (
                <tr key={moduleKey} className="odd:bg-white even:bg-ink-50/40">
                  <td className="border-b border-ink-100 px-3 py-2 text-ink-800">
                    {MODULE_LABELS[moduleKey]}
                  </td>
                  {SUBSCRIPTION_TIERS.map((tier) => {
                    const def = getTierDefinition(tier)
                    const on = Boolean(def.modules[moduleKey])
                    return (
                      <td key={tier} className="border-b border-ink-100 px-3 py-2 text-center">
                        <CheckGlyph on={on} srLabel={on ? 'Included' : 'Not included'} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-2">
        <h2 className="m-0 mb-4 text-xl font-semibold text-ink-900">Frequently asked</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FaqCard
            question="Are my receipts BIR-ready?"
            answer="TD POS issues BIR-ready provisional receipts that follow the BIR layout for register-printed receipts. Full accreditation is in progress; current receipts are usable for internal records and are clearly marked while accreditation is pending."
          />
          <FaqCard
            question="Does it work offline?"
            answer="Yes. Sales, cashier inventory, and shift handoff run entirely on the device. Sync to the cloud catches up automatically when the connection is back — no lost sales, no duplicate receipts."
          />
          <FaqCard
            question="Can I export my data?"
            answer="Owners can export sales (CSV and PDF) and customer records from the dashboard at any tier. Tier B Pro and above unlock recurring tenant-wide exports and audit-log downloads."
          />
          <FaqCard
            question="Do I need special hardware?"
            answer="No. Any Android phone or tablet (Android 11+) runs the cashier and tablet POS surfaces. USB or Bluetooth barcode scanners and thermal printers are supported but optional."
          />
        </div>
      </section>

      <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-ink-700">
        Receipt and export language is BIR-ready for accreditation. Public claims stay provisional
        until accreditation is complete.
      </p>
    </main>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-ink-200 bg-white p-5">
      <h3 className="m-0 text-base font-semibold text-ink-900">{question}</h3>
      <p className="m-0 text-sm text-ink-600">{answer}</p>
    </article>
  )
}
