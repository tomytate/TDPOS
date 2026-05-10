const PRINCIPLES = [
  'Cashier writes are local-first so stores can keep selling during outages.',
  'Support diagnostics are manager-triggered and sanitized before sharing.',
  'Dashboard views avoid exposing unnecessary personal data.',
  'Production analytics and messaging require consent before launch.',
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-10">
      <section>
        <p className="m-0 text-sm font-semibold uppercase text-teal-700">Privacy draft</p>
        <h1 className="m-0 mt-2 text-3xl font-semibold text-ink-900">Data posture</h1>
        <p className="mt-3 text-sm text-ink-600">
          This scaffold records the privacy promises that must be finalized before the public
          launch. Legal review and the final domain happen in the M0.9 pass.
        </p>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">Operating principles</h2>
        <ul className="mt-4 flex flex-col gap-2 pl-5 text-sm text-ink-700">
          {PRINCIPLES.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">Pilot support</h2>
        <p className="m-0 mt-2 text-sm text-ink-600">
          Pilot support channels remain private until the production support address and response
          targets are ready for the public site.
        </p>
      </section>
    </main>
  )
}
