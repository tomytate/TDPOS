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
      <section className="bg-teal-800 text-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 items-center gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-5">
            <p className="m-0 text-sm font-semibold uppercase tracking-wide text-teal-200">
              Philippine commerce POS
            </p>
            <h1 className="m-0 text-4xl font-semibold tracking-normal sm:text-5xl">TD POS</h1>
            <p className="m-0 max-w-xl text-lg text-teal-50">
              Tama ang stock mo. Lagi. Offline-first cashier, tingi inventory, and owner monitoring
              for stores that cannot afford wrong stock.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-amber-500"
              >
                View tiers
              </Link>
              <Link
                href="/privacy"
                className="rounded-md border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Data posture
              </Link>
            </div>
          </div>
          <PosPreview />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-10 md:grid-cols-3">
        {PROOF_POINTS.map((point) => (
          <article key={point.label} className="rounded-lg border border-ink-200 bg-white p-5">
            <p className="m-0 text-[11px] font-semibold uppercase text-teal-700">{point.label}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">{point.value}</h2>
            <p className="m-0 text-sm text-ink-600">{point.detail}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
