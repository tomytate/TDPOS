// Marketing landing page. Polished for v0.9 visual QA: stronger hero
// (tagline pill + larger headline + clearer CTAs), an explicit "Why
// TD POS" three-up grid that explains the wedge, a "Built for"
// segment band that previews who each tier serves, and an honest
// pilot-status banner so visitors know we are still pre-accreditation.

import Link from 'next/link'

const PROOF_POINTS = [
  {
    label: 'Offline cashier',
    value: 'Local-first',
    detail: 'Sales write to the device first, then sync when the connection returns.',
  },
  {
    label: 'Inventory wedge',
    value: 'Tingi-safe',
    detail: 'Stock is stored as canonical pieces so packs and sachets stay correct.',
  },
  {
    label: 'Launch posture',
    value: 'BIR-ready',
    detail: 'Receipt and export language stays ready for accreditation without overclaiming.',
  },
]

const SEGMENTS = [
  {
    name: 'Sari-sari / micro-stall',
    tier: 'Tier A · Free',
    body: 'Solo cashier on a single phone. Inventory + sales + owner monitoring.',
  },
  {
    name: 'Mini-mart / Alfamart-scale',
    tier: 'Tier B · Pro',
    body: 'Tablet POS, shift handoff, owner lanes, utang ledger, customer SMS.',
  },
  {
    name: 'Convenience / 7-11-scale',
    tier: 'Tier C · Plus',
    body: 'Multi-branch, manager-phone overrides, supplier management, loyalty.',
  },
  {
    name: 'Supermarket / Enterprise',
    tier: 'Tier D / E',
    body: 'Scanner lanes, weighted PLU, kiosk, returns desk, franchise rollup.',
  },
]

function PosPreview() {
  return (
    <div className="grid min-h-[25rem] gap-4 rounded-lg border border-teal-900/20 bg-white/95 p-4 shadow-2xl shadow-teal-900/20 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase text-teal-700">New sale</p>
            <h2 className="m-0 text-xl font-semibold text-ink-900">Sari-sari counter</h2>
          </div>
          <span className="rounded-md bg-amber-100 px-2 py-1 text-[12px] font-semibold text-amber-600">
            Offline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {['Shampoo sachet', 'Pancit canton', 'Coffee stick', 'Soft drink'].map((name, index) => (
            <div key={name} className="rounded-md border border-ink-200 bg-ink-50 p-3">
              <div
                className={
                  index % 2 === 0
                    ? 'mb-3 h-16 rounded-md bg-teal-100'
                    : 'mb-3 h-16 rounded-md bg-amber-100'
                }
              />
              <p className="m-0 text-sm font-semibold text-ink-900">{name}</p>
              <p className="m-0 text-[12px] text-ink-500">Piece and pack aware</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-col justify-between rounded-md bg-teal-900 p-4 text-white">
        <div>
          <p className="m-0 text-[11px] font-semibold uppercase text-teal-200">Cart</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <span>7 sachets</span>
              <span>P49.00</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>1 drink</span>
              <span>P20.00</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>P69.00</span>
          </div>
          <div className="mt-3 rounded-md bg-amber-400 px-3 py-2 text-center text-sm font-semibold text-ink-900">
            Charge
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function MarketingHomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-teal-800 text-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 items-center gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center rounded-full bg-teal-200/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-100">
              Tama ang stock mo. Lagi.
            </span>
            <h1 className="m-0 text-4xl font-semibold tracking-normal sm:text-5xl">
              POS that survives the brownout.
            </h1>
            <p className="m-0 max-w-xl text-lg text-teal-50">
              Offline-first cashier, tingi-safe inventory, and owner monitoring for stores that
              cannot afford wrong stock.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-amber-500"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="rounded-md border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                View tiers
              </Link>
              <Link
                href="/privacy"
                className="rounded-md border border-white/0 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-white/10"
              >
                Data posture
              </Link>
            </div>
          </div>
          <PosPreview />
        </div>
      </section>

      {/* Why TD POS — the wedge */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6 flex flex-col gap-2">
          <p className="m-0 text-sm font-semibold uppercase tracking-wide text-teal-700">
            Why TD POS
          </p>
          <h2 className="m-0 text-3xl font-semibold text-ink-900">
            Built around the realities of PH retail.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROOF_POINTS.map((point) => (
            <article key={point.label} className="rounded-lg border border-ink-200 bg-white p-5">
              <p className="m-0 text-[11px] font-semibold uppercase text-teal-700">{point.label}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-900">{point.value}</h3>
              <p className="m-0 mt-2 text-sm text-ink-600">{point.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Segments band */}
      <section className="bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-6 flex flex-col gap-2">
            <p className="m-0 text-sm font-semibold uppercase tracking-wide text-teal-700">
              Built for
            </p>
            <h2 className="m-0 text-3xl font-semibold text-ink-900">
              From sari-sari to franchise HQ.
            </h2>
            <p className="m-0 max-w-2xl text-sm text-ink-600">
              The same product source of truth powers every tier — cashier, multi-branch, and HQ.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SEGMENTS.map((segment) => (
              <article
                key={segment.name}
                className="flex flex-col gap-2 rounded-lg border border-ink-200 bg-white p-4"
              >
                <span className="inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                  {segment.tier}
                </span>
                <h3 className="m-0 text-base font-semibold text-ink-900">{segment.name}</h3>
                <p className="m-0 text-sm text-ink-600">{segment.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Honest pilot disclaimer */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="m-0 text-sm font-semibold uppercase text-amber-700">Pilot status</p>
          <p className="m-0 mt-2 text-sm text-ink-700">
            TD POS is in pilot. Receipts are BIR-ready and clearly marked while accreditation is in
            progress. Sales, inventory, and sync are production-quality; printer integration and
            physical barcode scanning are validated per pilot store.
          </p>
        </div>
      </section>
    </main>
  )
}
