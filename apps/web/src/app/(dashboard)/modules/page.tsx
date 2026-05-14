// Web modules + entitlements page. Polished for v0.9 visual QA:
// owner-friendly hero card with the tier + segment + price hint, the
// dev-only "UI mode" and "UI reference" rows are dropped from the
// happy path (still surfaced via diagnostics and the mobile scaffold
// dispatcher for design hand-off), module cards now carry a one-line
// description so owners understand what each toggle does, and the
// tier-surface grid groups by mobile / web / dashboard for legibility.

import {
  eraseCustomerPiiScaffoldAction,
  updateModulesScaffoldAction,
} from '@/app/(dashboard)/actions'
import { ErrorStateCard } from '@/components/error-state-card'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { getCustomerPrivacyRows, getModuleManagementRows } from '@/lib/queries/management'
import {
  SURFACE_LABELS,
  getMinimumTierForSurface,
  getTierDefinition,
  getTierSurfaces,
  type ModuleName,
  type TierSurface,
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

const MODULE_DESCRIPTIONS: Record<ModuleName, string> = {
  utang: 'Track customer credit and partial payments alongside cash sales.',
  customer_sms: 'Send receipt and balance updates by SMS — opt-in per customer.',
  loyalty: 'Points balance per customer with configurable earn and redemption rules.',
  supplier_management: 'Track supplier orders, stock-in, and supplier-specific costs.',
  multi_branch: 'Run more than one selling location with branch-level inventory.',
  franchise_management:
    'Franchise tooling: aggregated reporting, cross-branch promos, royalty splits.',
  payroll: 'Cashier time tracking and payroll hooks.',
  accounting_integration: 'Push receipts and journals to your accounting stack.',
  public_api: 'Token-based API for partner integrations.',
}

// Group tier surfaces for legibility: mobile.* together, web.* together,
// dashboard.* (overview) separately.
const TIER_SURFACES = getTierSurfaces().filter(
  (surface) => SURFACE_LABELS[surface].group !== 'marketing',
)

const MOBILE_SURFACES = TIER_SURFACES.filter((s) => SURFACE_LABELS[s].group === 'mobile')
const WEB_SURFACES = TIER_SURFACES.filter((s) => SURFACE_LABELS[s].group !== 'mobile')

function SurfaceCard({ surface, enabled }: { surface: TierSurface; enabled: boolean }) {
  const meta = SURFACE_LABELS[surface]
  const required = getTierDefinition(getMinimumTierForSurface(surface))
  return (
    <article
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
}

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
          <p className="mt-1 text-sm text-ink-600">
            Subscription tier and optional capabilities for this business.
          </p>
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
        <ErrorStateCard
          title={
            result.reason === 'supabase_unconfigured'
              ? 'Supabase is not configured'
              : 'Modules could not load'
          }
          body={
            result.reason === 'supabase_unconfigured'
              ? 'Set the Supabase env vars in apps/web/.env.local to connect this dashboard.'
              : (result.message ?? 'An unknown error occurred while loading modules.')
          }
        />
      ) : (
        <>
          {/* Owner-facing hero — business name + tier + limits in one card */}
          <section className="rounded-lg border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Business</p>
                <p className="m-0 text-xl font-semibold text-ink-900">
                  {result.business?.name ?? 'Not provisioned'}
                </p>
                {result.business?.address ? (
                  <p className="m-0 text-sm text-ink-500">{result.business.address}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-[12px] font-semibold uppercase text-white">
                    {result.entitlements.tierPublicName}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-200">
                    {result.entitlements.segment}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold capitalize text-ink-700 ring-1 ring-ink-200">
                    {result.entitlements.billing}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Stat label="Products" value={formatLimit(result.entitlements.maxProducts)} />
                <Stat label="Branches" value={formatLimit(result.entitlements.maxBranches)} />
                <Stat label="Devices" value={formatLimit(result.entitlements.maxDevices)} />
                <Stat label="Users" value={formatLimit(result.entitlements.maxUsers)} />
              </div>
            </div>
            <p className="m-0 mt-3 text-sm text-ink-600">{result.entitlements.description}</p>
          </section>

          {/* Modules grid — each card now explains what it does */}
          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-base font-semibold text-ink-900">Available modules</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.modules.map((module) => (
                <article
                  key={module.key}
                  className={
                    module.enabled
                      ? 'rounded-lg border border-teal-200 bg-teal-50/40 p-4'
                      : module.unlockedByTier
                        ? 'rounded-lg border border-ink-200 bg-white p-4'
                        : 'rounded-lg border border-ink-200 bg-ink-50 p-4'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="m-0 text-base font-semibold text-ink-900">{module.label}</h3>
                    <span
                      className={
                        module.enabled
                          ? 'rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-success-600'
                          : module.unlockedByTier
                            ? 'rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-500'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-700'
                      }
                    >
                      {module.enabled ? 'On' : module.unlockedByTier ? 'Off' : 'Locked'}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-sm text-ink-600">{MODULE_DESCRIPTIONS[module.key]}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Customer privacy */}
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
              <div className="mt-3">
                <ErrorStateCard
                  title={
                    customersResult.reason === 'supabase_unconfigured'
                      ? 'Supabase is not configured'
                      : 'Customer privacy rows could not load'
                  }
                  body={
                    customersResult.reason === 'supabase_unconfigured'
                      ? 'Set the Supabase env vars to enable customer erasure tooling.'
                      : (customersResult.message ?? 'An unknown error occurred.')
                  }
                />
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
                      intent="danger"
                      confirmationLabel="I understand this blanks customer-identifying fields while retaining required transaction records."
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

          {/* Surfaces — grouped by group */}
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

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Mobile surfaces
                </p>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {MOBILE_SURFACES.map((surface) => (
                    <SurfaceCard
                      key={surface}
                      surface={surface}
                      enabled={result.entitlements.isSurfaceEnabled(surface)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Web surfaces
                </p>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {WEB_SURFACES.map((surface) => (
                    <SurfaceCard
                      key={surface}
                      surface={surface}
                      enabled={result.entitlements.isSurfaceEnabled(surface)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{label}</p>
      <p className="m-0 mt-0.5 text-sm font-semibold text-ink-800">{value}</p>
    </div>
  )
}
