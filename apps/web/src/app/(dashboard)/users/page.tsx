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

export default async function UsersPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getUserManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.users') ?? false

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Users</h1>
          <p className="mt-1 text-sm text-ink-600">Cashier, manager, and owner access.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-400"
        >
          Invite user
        </button>
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
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Visible users</p>
              <p className="mt-2 text-2xl font-semibold text-teal-700">{result.users.length}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                {entitlements?.tierShortLabel ?? 'Tier'} limit
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">
                {formatLimit(entitlements?.maxUsers ?? null)}
              </p>
            </div>
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
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={4}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  result.users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        Phone {user.phoneSuffix}
                      </td>
                      <td className="px-4 py-3 text-ink-700">{user.role}</td>
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
