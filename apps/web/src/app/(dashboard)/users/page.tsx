// Web user management. Polished for v0.9 visual QA: shared MetricTile,
// tier-aware limit usage bar, role badge with tone (owner = teal,
// manager = amber, cashier/tindera = neutral), softer empty state.

import { inviteUserScaffoldAction } from '@/app/(dashboard)/actions'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBusinessEntitlements, getUserManagementRows } from '@/lib/queries/management'

function formatDate(iso: string): string {
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

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'good' | 'warn'
}) {
  const color =
    tone === 'good' ? 'text-teal-700' : tone === 'warn' ? 'text-amber-700' : 'text-ink-800'
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
        aria-label={`${used} of ${limit} users used`}
      >
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase()
  const styles =
    normalized === 'owner'
      ? 'bg-teal-100 text-teal-800'
      : normalized === 'manager'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-ink-100 text-ink-700'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${styles}`}
    >
      {role}
    </span>
  )
}

export default async function UsersPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getUserManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.users') ?? false
  const totalUsers = result.ready ? result.users.length : 0

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Users</h1>
          <p className="mt-1 text-sm text-ink-600">Cashier, manager, and owner access.</p>
        </div>
        <ScaffoldActionButton
          action={inviteUserScaffoldAction}
          label="Validate invite scaffold"
          fields={[
            {
              kind: 'text',
              name: 'phone',
              label: 'Phone',
              placeholder: '09171234567',
              required: true,
            },
            {
              kind: 'select',
              name: 'role',
              label: 'Role',
              defaultValue: 'cashier',
              options: [
                { label: 'Cashier', value: 'cashier' },
                { label: 'Tindera', value: 'tindera' },
                { label: 'Manager', value: 'manager' },
                { label: 'Owner', value: 'owner' },
              ],
            },
          ]}
        />
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="User management"
          unlockedAt="Pro"
        />
      ) : null}

      {!result.ready ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase is not configured.'
            : `Users could not load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricTile label="Visible users" value={totalUsers} tone="good" />
            <LimitUsageBar
              used={totalUsers}
              limit={entitlements?.maxUsers ?? null}
              tierLabel={entitlements?.tierShortLabel ?? 'Tier'}
            />
          </section>

          <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      <p className="m-0 text-base font-semibold text-ink-800">No users yet</p>
                      <p className="mt-1 text-sm text-ink-500">
                        Use “Validate invite scaffold” above to add the first cashier or manager.
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink-900">Phone {user.phoneSuffix}</div>
                        <div className="mt-0.5 text-[12px] text-ink-500">
                          Only the last 4 digits are shown
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {user.emailPresent ? 'Present' : '--'}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
