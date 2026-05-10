import { getModuleManagementRows } from '@/lib/queries/management'

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

export default async function ModulesPage() {
  const result = await getModuleManagementRows()

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Modules</h1>
          <p className="mt-1 text-sm text-ink-600">Subscription tier and optional capabilities.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-400"
        >
          Update modules
        </button>
      </header>

      {!result.ready ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase is not configured.'
            : `Modules could not load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-ink-200 bg-white p-4 sm:col-span-2">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Business</p>
              <p className="mt-2 text-xl font-semibold text-ink-900">
                {result.business?.name ?? 'Not provisioned'}
              </p>
              <p className="mt-1 text-sm text-ink-500">{result.business?.address ?? '--'}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Tier</p>
              <p className="mt-2 text-2xl font-semibold text-teal-700">
                {result.entitlements.tierShortLabel}
              </p>
              <p className="mt-1 text-[12px] text-ink-500">{result.entitlements.description}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Branches</p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">
                {formatLimit(result.entitlements.maxBranches)}
              </p>
              <p className="mt-1 text-[12px] text-ink-500">
                {formatLimit(result.entitlements.maxDevices)} devices ·{' '}
                {formatLimit(result.entitlements.maxUsers)} users
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.modules.map((module) => (
              <article key={module.key} className="rounded-lg border border-ink-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="m-0 text-base font-semibold text-ink-900">{module.label}</h2>
                  <span
                    className={
                      module.enabled
                        ? 'rounded-full bg-success-500/10 px-2 py-0.5 text-[12px] font-semibold text-success-600'
                        : module.unlockedByTier
                          ? 'rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-500'
                          : 'rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-700'
                    }
                  >
                    {module.enabled ? 'On' : module.unlockedByTier ? 'Off' : 'Locked'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
