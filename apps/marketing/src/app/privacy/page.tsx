// Marketing privacy. Polished for v0.9 visual QA: a draft chip in
// the header (so visitors know this is the pre-launch scaffold,
// not the final legal copy), grouped operating-principles + pilot
// support + data-residency sections, and a "last updated" line so
// the page reads like a real privacy notice rather than a placeholder.

const PRINCIPLES = [
  'Cashier writes are local-first so stores can keep selling during outages.',
  'Support diagnostics are manager-triggered and sanitized before sharing.',
  'Dashboard views avoid exposing unnecessary personal data.',
  'Production analytics and messaging require consent before launch.',
]

const DATA_SCOPES = [
  {
    label: 'On the device',
    body: 'Sales, inventory, receipt numbers, device identity, sync status. Stays on-device when offline.',
  },
  {
    label: 'On the server',
    body: 'Synced sales, customers (only if a customer-facing module is enabled), audit log, business + branch records.',
  },
  {
    label: 'In support bundles',
    body: 'Counts, schema versions, and sanitized diagnostics. Phone numbers and emails are stripped before leaving the device.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-10">
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Privacy draft · pilot
        </span>
        <h1 className="m-0 mt-2 text-3xl font-semibold text-ink-900">Data posture</h1>
        <p className="m-0 text-sm text-ink-600">
          This scaffold records the privacy promises that must be finalized before the public
          launch. Legal review and the final domain happen in the M0.9 pass.
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
        <h2 className="m-0 text-lg font-semibold text-ink-900">Operating principles</h2>
        <ul className="mt-4 flex flex-col gap-2 pl-5 text-sm text-ink-700">
          {PRINCIPLES.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">Where data lives</h2>
        <div className="mt-3 flex flex-col gap-3">
          {DATA_SCOPES.map((scope) => (
            <div key={scope.label} className="rounded-md border border-ink-100 bg-ink-50/50 p-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                {scope.label}
              </p>
              <p className="m-0 mt-1 text-sm text-ink-700">{scope.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-ink-900">Pilot support</h2>
        <p className="m-0 mt-2 text-sm text-ink-600">
          Pilot support channels remain private until the production support address and response
          targets are ready for the public site. In-app support bundles are manager-triggered and
          stripped of phone numbers and emails before they leave the device.
        </p>
      </section>
    </main>
  )
}
