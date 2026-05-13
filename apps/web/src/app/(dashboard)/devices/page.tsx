import { TierLockBanner } from '@/components/tier-lock-banner'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import {
  markDeviceLostForReplacementAction,
  updateDeviceStatusScaffoldAction,
} from '@/app/(dashboard)/actions'
import { getBusinessEntitlements, getDeviceManagementRows } from '@/lib/queries/management'

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

function freshnessClassName(freshness: string): string {
  if (freshness === 'fresh') return 'bg-success-500/10 text-success-600'
  if (freshness === 'stale') return 'bg-amber-50 text-amber-700'
  if (freshness === 'offline') return 'bg-danger-50 text-danger-600'
  if (freshness === 'lost') return 'bg-danger-50 text-danger-600'
  return 'bg-ink-100 text-ink-500'
}

export default async function DevicesPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getDeviceManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.devices') ?? false

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
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase is not configured.'
            : `Devices could not load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
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

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Registered</p>
              <p className="mt-2 text-2xl font-semibold text-teal-700">{result.devices.length}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">{result.activeCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Stale</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{result.staleCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Offline</p>
              <p className="mt-2 text-2xl font-semibold text-danger-600">{result.offlineCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Lost</p>
              <p className="mt-2 text-2xl font-semibold text-danger-600">{result.lostCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                {entitlements?.tierShortLabel ?? 'Tier'} limit
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">
                {formatLimit(entitlements?.maxDevices ?? null)}
              </p>
            </div>
          </section>

          <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Surface</th>
                  <th className="px-4 py-3 font-semibold">Queue</th>
                  <th className="px-4 py-3 font-semibold">Last seen</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.devices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={6}>
                      No devices have heartbeated yet.
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${freshnessClassName(
                            device.freshness,
                          )}`}
                        >
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
