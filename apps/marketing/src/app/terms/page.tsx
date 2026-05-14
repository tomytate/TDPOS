// Marketing terms. Polished for v0.9 visual QA: aligned with the
// privacy draft chip pattern, a clearer "current boundaries" list,
// and a separate "what changes at launch" section so pilot
// customers understand what's a scaffold vs what's the contract.

const TERMS = [
  'Tier A is the free entry tier for micro-store cashier workflows.',
  'Paid tier limits are enforced through the shared entitlement model.',
  'Stores remain responsible for reviewing reports before formal filing.',
  'Hardware features depend on validated device builds and supported peripherals.',
]

const LAUNCH_CHANGES = [
  'Final legal entity, contact address, and dispute-resolution clauses replace the pilot placeholders.',
  'BIR accreditation language replaces the "BIR-ready provisional" qualifiers on receipts and exports.',
  'Subscription billing terms, refund window, and SLA targets get published once the payment processor is wired.',
]

export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-10">
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Terms draft · pilot
        </span>
        <h1 className="m-0 mt-2 text-3xl font-semibold text-ink-900">Pilot terms scaffold</h1>
        <p className="m-0 text-sm text-ink-600">
          These terms are a product scaffold, not the final public legal copy. Legal review lands
          before M0.9.
        </p>
        <p className="m-0 mt-1 text-[12px] text-ink-500">
          Last updated{' '}
          {new Date().toLocaleDateString('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          .
        </p>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">Current boundaries</h2>
        <ul className="mt-4 flex flex-col gap-2 pl-5 text-sm text-ink-700">
          {TERMS.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">What changes at launch</h2>
        <ul className="mt-4 flex flex-col gap-2 pl-5 text-sm text-ink-700">
          {LAUNCH_CHANGES.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
