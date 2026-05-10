const TERMS = [
  'Tier A is the free entry tier for micro-store cashier workflows.',
  'Paid tier limits are enforced through the shared entitlement model.',
  'Stores remain responsible for reviewing reports before formal filing.',
  'Hardware features depend on validated device builds and supported peripherals.',
]

export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-10">
      <section>
        <p className="m-0 text-sm font-semibold uppercase text-teal-700">Terms draft</p>
        <h1 className="m-0 mt-2 text-3xl font-semibold text-ink-900">Pilot terms scaffold</h1>
        <p className="mt-3 text-sm text-ink-600">
          These terms are a product scaffold, not the final public legal copy. Legal review lands
          before M0.9.
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
    </main>
  )
}
