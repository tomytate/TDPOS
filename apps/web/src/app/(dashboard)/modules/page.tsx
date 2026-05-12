import {
  eraseCustomerPiiScaffoldAction,
  updateModulesScaffoldAction,
} from '@/app/(dashboard)/actions'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { getCustomerPrivacyRows, getModuleManagementRows } from '@/lib/queries/management'
import {
  SURFACE_LABELS,
  getMinimumTierForSurface,
  getTierDefinition,
  getTierSurfaces,
} from '@tdpos/shared'

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const TIER_SURFACES = getTierSurfaces().filter(
  (surface) => SURFACE_LABELS[surface].group !== 'marketing',
)

export default async function ModulesPage() {
  const [result, customersResult] = await Promise.all([
    getModuleManagementRows(),
    getCustomerPrivacyRows(),
  ])
  const customerEraseOptions = customersResult.ready
    ? customersResult.customers
        .filter((customer) => !customer.piiErased)
        .map((customer) => ({
          label: `${customer.name} (${customer.phoneSuffix})`,
          value: customer.id,
        }))
    : []

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Modules</h1>
          <p className="mt-1 text-sm text-ink-600">Subscription tier and optional capabilities.</p>
        </div>
        <ScaffoldActionButton
          action={updateModulesScaffoldAction}
          label="Validate module scaffold"
          fields={[
            { kind: 'checkbox', name: 'utang', label: 'Utang ledger' },
            { kind: 'checkbox', name: 'customer_sms', label: 'Customer SMS' },
            { kind: 'checkbox', name: 'loyalty', label: 'Loyalty' },
            { kind: 'checkbox', name: 'supplier_management', label: 'Supplier management' },
            { kind: 'checkbox', name: 'multi_branch', label: 'Multi-branch' },
          ]}
        />
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
                {result.entitlements.tierPublicName}
              </p>
              <p className="mt-1 text-[12px] font-semibold uppercase text-ink-500">
                {result.entitlements.segment}
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

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Billing</p>
              <p className="mt-2 text-lg font-semibold capitalize text-ink-900">
                {result.entitlements.billing}
              </p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">UI mode</p>
              <p className="mt-2 text-lg font-semibold text-ink-900">
                {result.entitlements.uiMode.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">UI reference</p>
              <p className="mt-2 text-[13px] font-semibold text-ink-700">
                {result.entitlements.uiSource}
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

          <section className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-semibold text-ink-900">
                  Customer privacy actions
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Owner/manager erasure blanks customer PII while preserving transaction references
                  and sanitized audit evidence.
                </p>
              </div>
              {customersResult.ready ? (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-600">
                  {customersResult.customers.length} visible
                </span>
              ) : null}
            </div>

            {!customersResult.ready ? (
              <div
                role="status"
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"
              >
                {customersResult.reason === 'supabase_unconfigured'
                  ? 'Supabase is not configured.'
                  : `Customer privacy rows could not load: ${customersResult.message ?? 'unknown error'}`}
              </div>
            ) : !customersResult.canErase ? (
              <p className="mt-3 text-sm text-ink-500">
                Customer PII erasure is available to owner and manager roles.
              </p>
            ) : (
              <>
                {customerEraseOptions.length > 0 ? (
                  <div className="mt-3">
                    <ScaffoldActionButton
                      action={eraseCustomerPiiScaffoldAction}
                      label="Erase selected customer PII"
                      fields={[
                        {
                          kind: 'select',
                          name: 'customer_id',
                          label: 'Customer',
                          options: customerEraseOptions,
                        },
                        {
                          kind: 'text',
                          name: 'reason',
                          label: 'Reason',
                          placeholder: 'Customer requested erasure',
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">
                    No active customer PII profiles are available to erase.
                  </p>
                )}

                <div className="mt-4 overflow-hidden rounded-lg border border-ink-100">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Customer</th>
                        <th className="px-3 py-2 font-semibold">Phone</th>
                        <th className="px-3 py-2 font-semibold">Utang</th>
                        <th className="px-3 py-2 font-semibold">Points</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {customersResult.customers.length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-ink-500" colSpan={5}>
                            No customer profiles found.
                          </td>
                        </tr>
                      ) : (
                        customersResult.customers.map((customer) => (
                          <tr key={customer.id}>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-ink-900">{customer.name}</div>
                              <div className="font-mono text-[12px] text-ink-500">
                                ...{customer.id.slice(-8)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-ink-600">{customer.phoneSuffix}</td>
                            <td className="px-3 py-2 tabular-nums text-ink-700">
                              {customer.formattedUtang}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-ink-700">
                              {customer.pointsBalance}
                            </td>
                            <td className="px-3 py-2">
                              {customer.piiErased ? (
                                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-600">
                                  Erased {formatDate(customer.erasedAt)}
                                </span>
                              ) : (
                                <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[12px] font-semibold text-success-600">
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-semibold text-ink-900">Tier surfaces</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Route scaffold matrix sourced from the same A-E tier definitions as mobile.
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[12px] font-semibold text-teal-700">
                {result.entitlements.tierPublicName}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {TIER_SURFACES.map((surface) => {
                const meta = SURFACE_LABELS[surface]
                const required = getTierDefinition(getMinimumTierForSurface(surface))
                const enabled = result.entitlements.isSurfaceEnabled(surface)

                return (
                  <article
                    key={surface}
                    className={
                      enabled
                        ? 'rounded-lg border border-teal-100 bg-teal-50/70 p-3'
                        : 'rounded-lg border border-ink-200 bg-ink-50 p-3'
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="m-0 text-sm font-semibold text-ink-900">{meta.label}</p>
                        <p className="mt-0.5 text-[12px] text-ink-500">{meta.description}</p>
                      </div>
                      <span
                        className={
                          enabled
                            ? 'shrink-0 rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-semibold uppercase text-white'
                            : 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-700'
                        }
                      >
                        {enabled ? 'On' : required.shortLabel}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
