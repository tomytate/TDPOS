// Web device management. Polished for v0.9 visual QA: shared MetricTile
// + LimitUsageBar with the tier cap, completed freshness pill class
// (was missing padding/rounded on the recent-codes table), grouped
// "Setup" affordances (pair new device + recent codes + lost
// replacement) above the live device table, and tone-aware status
// pill so an offline / lost device reads at a glance.

import { ErrorStateCard } from '@/components/error-state-card'
import { TierLockBanner } from '@/components/tier-lock-banner'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import {
  createDevicePairingCodeAction,
  markDeviceLostForReplacementAction,
  updateDeviceStatusScaffoldAction,
} from '@/app/(dashboard)/actions'
import { getBusinessEntitlements, getDeviceManagementRows } from '@/lib/queries/management'
import { SURFACE_LABELS, getTierSurfaces } from '@tdpos/shared'

function formatTimestamp(value: string | number | null): string {
  if (value === null) return 'never'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

function formatQueue(value: number | null): string {
  return value === null ? '--' : value.toLocaleString('en-PH')
}

function formatReceiptDateKey(value: string): string {
  if (!/^\d{8}$/.test(value)) return value
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase'

function freshnessPillClass(freshness: string): string {
  if (freshness === 'fresh') return `${PILL_BASE} bg-success-500/10 text-success-600`
  if (freshness === 'stale') return `${PILL_BASE} bg-amber-100 text-amber-700`
  if (freshness === 'offline') return `${PILL_BASE} bg-danger-500/10 text-danger-600`
  if (freshness === 'lost') return `${PILL_BASE} bg-danger-500/15 text-danger-600`
  return `${PILL_BASE} bg-ink-100 text-ink-500`
}

function pairingPillClass(status: string): string {
  if (status === 'paired') return `${PILL_BASE} bg-success-500/10 text-success-600`
  if (status === 'fallback') return `${PILL_BASE} bg-amber-100 text-amber-700`
  if (status === 'unpaired') return `${PILL_BASE} bg-danger-500/10 text-danger-600`
  return `${PILL_BASE} bg-ink-100 text-ink-500`
}

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  const color =
    tone === 'good'
      ? 'text-teal-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-danger-600'
          : 'text-ink-800'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function LimitUsageBar({
  used,
  limit,
  tierLabel,
}: {
  used: number
  limit: number | null
  tierLabel: string
}) {
  if (limit === null) {
    return (
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
        <p className="mt-2 text-2xl font-semibold text-ink-800">Unlimited</p>
        <p className="mt-1 text-[12px] text-ink-500">No cap at this tier.</p>
      </div>
    )
  }
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100)
  const tone = pct >= 95 ? 'bg-danger-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal-600'
  const valueColor = pct >= 95 ? 'text-danger-600' : pct >= 80 ? 'text-amber-700' : 'text-teal-700'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {used.toLocaleString('en-PH')}
        <span className="text-base font-normal text-ink-500"> / {formatLimit(limit)}</span>
      </p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${used} of ${limit} devices used`}
      >
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function DevicesPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getDeviceManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.devices') ?? false
  const mobileSurfaceOptions = getTierSurfaces('mobile')
    .filter((surface) => entitlements?.isSurfaceEnabled(surface) ?? false)
    .map((surface) => ({
      label: SURFACE_LABELS[surface].label,
      value: surface,
    }))

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Devices</h1>
          <p className="mt-1 text-sm text-ink-600">
            Registered cashier devices, lane status, and sanitized local queue snapshots.
          </p>
        </div>
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Device management"
          unlockedAt="Pro"
        />
      ) : null}

      {!result.ready ? (
        <ErrorStateCard
          title={
            result.reason === 'supabase_unconfigured'
              ? 'Supabase is not configured'
              : 'Devices could not load'
          }
          body={
            result.reason === 'supabase_unconfigured'
              ? 'Set the Supabase env vars in apps/web/.env.local to connect this dashboard.'
              : (result.message ?? 'An unknown error occurred while loading devices.')
          }
        />
      ) : (
        <>
          {/* Metrics top — owners look here first */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricTile label="Registered" value={result.devices.length} tone="good" />
            <MetricTile label="Active" value={result.activeCount} tone="good" />
            <MetricTile
              label="Stale"
              value={result.staleCount}
              tone={result.staleCount > 0 ? 'warn' : 'neutral'}
            />
            <MetricTile
              label="Offline"
              value={result.offlineCount}
              tone={result.offlineCount > 0 ? 'danger' : 'neutral'}
            />
            <MetricTile
              label="Lost"
              value={result.lostCount}
              tone={result.lostCount > 0 ? 'danger' : 'neutral'}
            />
            <LimitUsageBar
              used={result.devices.length}
              limit={entitlements?.maxDevices ?? null}
              tierLabel={entitlements?.tierShortLabel ?? 'Tier'}
            />
          </section>

          {/* Setup affordances — pair, recent codes, lost replacement */}
          {canManage ? (
            <section className="rounded-lg border border-teal-100 bg-teal-50 p-4">
              <div className="mb-3">
                <h2 className="m-0 text-base font-semibold text-ink-900">Pair a new device</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Issue a short-lived code for a cashier phone or tablet. The full code is shown
                  once after creation; only the ending stays in the dashboard.
                </p>
              </div>
              {result.branches.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-700">
                  Add an active branch before issuing a device code.
                </div>
              ) : (
                <ScaffoldActionButton
                  action={createDevicePairingCodeAction}
                  label="Issue device code"
                  fields={[
                    {
                      kind: 'select',
                      name: 'branch_id',
                      label: 'Branch',
                      options: result.branches.map((branch) => ({
                        label: `${branch.branchCode} · ${branch.name}`,
                        value: branch.id,
                      })),
                    },
                    {
                      kind: 'text',
                      name: 'cashier_code',
                      label: 'Cashier code',
                      defaultValue: 'C01',
                      required: true,
                    },
                    {
                      kind: 'text',
                      name: 'device_name',
                      label: 'Device name',
                      placeholder: 'Front counter phone',
                    },
                    {
                      kind: 'select',
                      name: 'surface',
                      label: 'Surface',
                      defaultValue: mobileSurfaceOptions[0]?.value ?? 'mobile.tier_a_cashier',
                      options: mobileSurfaceOptions,
                    },
                    {
                      kind: 'select',
                      name: 'expires_minutes',
                      label: 'Expires',
                      defaultValue: '30',
                      options: [
                        { label: '30 minutes', value: '30' },
                        { label: '1 hour', value: '60' },
                        { label: '4 hours', value: '240' },
                        { label: '24 hours', value: '1440' },
                      ],
                    },
                  ]}
                />
              )}
            </section>
          ) : null}

          {canManage && result.pairingCodes.length > 0 ? (
            <section className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="m-0 text-base font-semibold text-ink-900">Recent pairing codes</h2>
                  <p className="mt-1 text-sm text-ink-600">
                    {result.activePairingCount} active code
                    {result.activePairingCount === 1 ? '' : 's'} waiting for a device.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Code</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Cashier</th>
                      <th className="px-3 py-2 font-semibold">Surface</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {result.pairingCodes.map((code) => (
                      <tr key={code.id}>
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-700">
                          ****{code.pairingCodeLast4}
                        </td>
                        <td className="px-3 py-2 text-ink-700">{code.branchName ?? '--'}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-700">
                          {code.cashierCode}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-700">
                          {code.surface}
                        </td>
                        <td className="px-3 py-2">
                          <span className={freshnessPillClass(code.status)}>{code.status}</span>
                          {code.consumedAt ? (
                            <div className="mt-1 text-[11px] text-ink-500">
                              Used {formatTimestamp(code.consumedAt)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-ink-600">
                          {formatTimestamp(code.expiresAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {canManage && result.devices.length > 0 ? (
            <section className="rounded-lg border border-ink-200 bg-ink-50 p-4">
              <div className="mb-3">
                <h2 className="m-0 text-base font-semibold text-ink-900">
                  Lost-device replacement
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  Mark a missing device as lost, preserve its latest queue and receipt-sequence
                  snapshot for support, and release its paid-tier device slot for the next
                  heartbeat.
                </p>
              </div>
              <ScaffoldActionButton
                action={markDeviceLostForReplacementAction}
                label="Prepare replacement"
                intent="danger"
                confirmationLabel="I understand this marks the device lost and preserves its last reported recovery snapshot."
                fields={[
                  {
                    kind: 'select',
                    name: 'device_id',
                    label: 'Device',
                    options: result.devices.map((device) => ({
                      label: `${device.deviceName ?? `Device ${device.installTail}`} (${device.status})`,
                      value: device.id,
                    })),
                  },
                  {
                    kind: 'text',
                    name: 'recovery_note',
                    label: 'Recovery note',
                    placeholder: 'Example: replacement phone issued to C01',
                  },
                  {
                    kind: 'checkbox',
                    name: 'acknowledge_unsynced',
                    label: 'Local export copied if queue rows remain',
                  },
                  {
                    kind: 'checkbox',
                    name: 'acknowledge_receipts',
                    label: 'Receipt sequence snapshot reviewed',
                  },
                ]}
              />
            </section>
          ) : null}

          {/* Live device table */}
          <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Surface</th>
                  <th className="px-4 py-3 font-semibold">Pairing</th>
                  <th className="px-4 py-3 font-semibold">Queue</th>
                  <th className="px-4 py-3 font-semibold">Last seen</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.devices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={7}>
                      <p className="m-0 text-base font-semibold text-ink-800">
                        No devices have heartbeated yet
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        Issue a pairing code above; the device shows up here on its first successful
                        sign-in.
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.devices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink-900">
                          {device.deviceName ?? `Device ${device.installTail}`}
                        </div>
                        <div className="mt-0.5 font-mono text-[12px] text-ink-500">
                          {device.installTail}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{device.branchName ?? '--'}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-ink-700">
                        {device.surface}
                      </td>
                      <td className="px-4 py-3">
                        <span className={pairingPillClass(device.pairingStatus)}>
                          {device.pairingStatus}
                        </span>
                        {device.pairingCodeTail ? (
                          <div className="mt-1 font-mono text-[11px] text-ink-500">
                            {device.pairingCodeTail}
                          </div>
                        ) : null}
                        {device.pairedAt ? (
                          <div className="mt-1 text-[11px] text-ink-500">
                            Paired {formatTimestamp(device.pairedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-700">
                        <div>{formatQueue(device.unsyncedRows)} unsynced</div>
                        <div className="text-ink-500">
                          {formatQueue(device.pendingRows)} pending ·{' '}
                          {formatQueue(device.failedRows)} failed ·{' '}
                          {formatQueue(device.reviewableRows)} review
                        </div>
                        {device.oldestPendingCreatedAt ? (
                          <div className="text-ink-500">
                            Oldest {formatTimestamp(device.oldestPendingCreatedAt)}
                          </div>
                        ) : null}
                        {device.receiptSequences.length > 0 ? (
                          <div className="mt-1 text-ink-500">
                            Receipt seq{' '}
                            {device.receiptSequences
                              .slice(0, 2)
                              .map(
                                (sequence) =>
                                  `${sequence.branchCode}/${sequence.cashierCode}/${formatReceiptDateKey(
                                    sequence.date,
                                  )}: ${sequence.lastSequence}`,
                              )
                              .join(' · ')}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {formatTimestamp(device.lastSeenAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={freshnessPillClass(device.freshness)}>
                          {device.status} · {device.freshness}
                        </span>
                        {device.lostReportedAt ? (
                          <div className="mt-1 text-[11px] text-ink-500">
                            Reported {formatTimestamp(device.lostReportedAt)}
                          </div>
                        ) : null}
                        {device.replacementRequestedAt ? (
                          <div className="text-[11px] text-ink-500">Replacement prepared</div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] text-ink-500">
            Queue values are local counts reported by the device heartbeat. Raw sync payloads stay
            on-device and never appear in this dashboard.
          </p>

          {canManage && result.devices.length > 0 ? (
            <section className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="mb-3">
                <h2 className="m-0 text-base font-semibold text-ink-900">Manual status override</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Use this only to reactivate a recovered device or park a lane as inactive. Lost
                  replacements should use the recovery flow above.
                </p>
              </div>
              <ScaffoldActionButton
                action={updateDeviceStatusScaffoldAction}
                label="Set status"
                confirmationLabel="I reviewed the selected device and understand this status change affects lane access."
                fields={[
                  {
                    kind: 'select',
                    name: 'device_id',
                    label: 'Device',
                    options: result.devices.map((device) => ({
                      label: `${device.deviceName ?? `Device ${device.installTail}`} (${device.status})`,
                      value: device.id,
                    })),
                  },
                  {
                    kind: 'select',
                    name: 'status',
                    label: 'Next status',
                    defaultValue: 'inactive',
                    options: [
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                      { label: 'Lost', value: 'lost' },
                    ],
                  },
                ]}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
