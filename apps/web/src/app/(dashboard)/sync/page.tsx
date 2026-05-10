// Phase W0.7 — Sync health view.
//
// Server Component snapshot of `applied_operations` for the caller's tenant.
// Surfaces stuck operations, recent failures, and 24h throughput. Reasons are
// operation-classification labels from the race-safe RPC, never PII (ADR-014).

import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBusinessEntitlements } from '@/lib/queries/management'
import { getSyncHealthSnapshot } from '@/lib/queries/sync-health'

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'never'
  try {
    return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function formatDeviceTimestamp(value: string | number | null): string {
  if (value === null) return 'never'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return formatTimestamp(date.toISOString())
}

function tailRef(value: string): string {
  return value.length > 8 ? `…${value.slice(-8)}` : value
}

function statusToneFor(
  stuck: number,
  failed: number,
): {
  label: string
  className: string
  description: string
} {
  if (stuck > 0) {
    return {
      label: 'Action needed',
      className: 'border-danger-500 bg-danger-50 text-danger-600',
      description: `${stuck} stuck reservation${stuck === 1 ? '' : 's'} older than 60s.`,
    }
  }
  if (failed > 0) {
    return {
      label: 'Review failures',
      className: 'border-amber-300 bg-amber-50 text-amber-700',
      description: `${failed} failed operation${failed === 1 ? '' : 's'} in the last 24h.`,
    }
  }
  return {
    label: 'Healthy',
    className: 'border-success-500 bg-success-50 text-success-600',
    description: 'No stuck or failed operations.',
  }
}

export default async function SyncHealthPage() {
  const entitlementsResult = await getBusinessEntitlements()
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canView = entitlements?.isSurfaceEnabled('web.sync') ?? false

  if (entitlements && !canView) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-semibold text-ink-900">Sync health</h1>
            <p className="mt-1 text-sm text-ink-600">
              Tenant sync diagnostics and operation queue snapshots.
            </p>
          </div>
        </header>
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Sync health"
          unlockedAt="Plus"
          copy={
            <>
              Sync health is not included on your current tier. Upgrade to{' '}
              <span className="font-semibold">Plus</span> to view operational sync diagnostics.
            </>
          }
        />
      </div>
    )
  }

  const result = await getSyncHealthSnapshot()

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Sync health</h1>
          <p className="mt-1 text-sm text-ink-600">
            Snapshot of <code>applied_operations</code> across your tenant. Reasons are operation
            labels only — no PII.
          </p>
        </div>
        {result.ready ? (
          <span className="text-[12px] text-ink-500">
            Generated {formatTimestamp(result.generatedAt)}
          </span>
        ) : null}
      </header>

      {!result.ready ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700"
        >
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase environment is not configured.'
            : `Couldn’t load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
          {(() => {
            const tone = statusToneFor(result.snapshot.stuckCount, result.snapshot.failedCount)
            return (
              <article
                role="status"
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tone.className}`}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded bg-white/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[1px]">
                    {tone.label}
                  </span>
                  <span className="text-[13px]">{tone.description}</span>
                </div>
                <span className="text-[12px] opacity-70">
                  Last applied {formatTimestamp(result.snapshot.lastAppliedAt)}
                </span>
              </article>
            )
          })()}

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
                Completed (24h)
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-teal-700">
                {result.snapshot.completedCount24h}
              </p>
            </article>
            <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
                In progress
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-700">
                {result.snapshot.inProgressCount}
              </p>
            </article>
            <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
                Stuck (&gt;60s)
              </p>
              <p
                className={`mt-2 text-3xl font-semibold tabular-nums ${
                  result.snapshot.stuckCount > 0 ? 'text-danger-600' : 'text-ink-700'
                }`}
              >
                {result.snapshot.stuckCount}
              </p>
            </article>
            <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
                Failed (24h)
              </p>
              <p
                className={`mt-2 text-3xl font-semibold tabular-nums ${
                  result.snapshot.failedCount > 0 ? 'text-amber-700' : 'text-ink-700'
                }`}
              >
                {result.snapshot.failedCount}
              </p>
            </article>
            <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
                Active devices
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-teal-700">
                {result.snapshot.activeDeviceCount}
              </p>
            </article>
          </section>

          <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
            <header className="flex items-baseline justify-between">
              <h2 className="m-0 text-base font-semibold text-teal-700">Registered devices</h2>
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {result.snapshot.devices.length} latest
              </span>
            </header>
            {result.snapshot.devices.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                No devices registered yet. Mobile heartbeat wiring lands in the device-management
                scaffold.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                {result.snapshot.devices.map((device) => (
                  <li
                    key={device.id}
                    className="grid grid-cols-1 gap-2 py-2 text-[13px] sm:grid-cols-[1fr_auto_auto]"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-ink-900">
                        {device.deviceName ?? `Device ${device.installTail}`}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        {device.branchName ?? 'No branch'} · {device.surface}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        Queue:{' '}
                        {device.unsyncedRows === null
                          ? 'not reported'
                          : `${device.unsyncedRows} unsynced · ${device.pendingRows ?? 0} pending · ${
                              device.failedRows ?? 0
                            } failed · ${device.reviewableRows ?? 0} review`}
                      </span>
                      {device.oldestPendingCreatedAt ? (
                        <span className="text-[12px] text-ink-500">
                          Oldest pending {formatDeviceTimestamp(device.oldestPendingCreatedAt)}
                        </span>
                      ) : null}
                    </div>
                    <span className="rounded bg-ink-50 px-2 py-0.5 text-[12px] font-semibold uppercase text-ink-600">
                      {device.status}
                    </span>
                    <span className="text-[12px] text-ink-500">
                      Seen {formatTimestamp(device.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
            <header className="flex items-baseline justify-between">
              <h2 className="m-0 text-base font-semibold text-teal-700">Recent failures</h2>
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {result.snapshot.recentFailures.length} latest
              </span>
            </header>
            {result.snapshot.recentFailures.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No failures recorded.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                {result.snapshot.recentFailures.map((failure) => (
                  <li
                    key={failure.clientOperationId}
                    className="flex items-center justify-between gap-3 py-2 text-[13px]"
                  >
                    <div className="flex flex-1 flex-col">
                      <span className="font-mono text-ink-700">
                        {tailRef(failure.clientOperationId)}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        {formatTimestamp(failure.completedAt ?? failure.appliedAt)}
                      </span>
                    </div>
                    <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-[12px] text-amber-700">
                      {failure.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <p className="text-[12px] text-ink-500">
            Stuck reservations older than 60s are normally cleaned up by the
            <code className="mx-1">applied_operations</code> stale-cleanup job. If the stuck count
            stays positive across reloads, check the cron task or contact support. Device rows come
            from the paid-tier `business_devices` scaffold and intentionally expose only device
            labels, surfaces, status, branch, and last-seen time.
          </p>
        </>
      )}
    </div>
  )
}
