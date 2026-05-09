/**
 * Auth bootstrap — populates the local Zustand auth store from a verified
 * Supabase session.
 *
 * Called by the auth state listener whenever Supabase reports `INITIAL_SESSION`
 * or `SIGNED_IN`. Does the cross-table joins the JWT alone can't do:
 *
 *   1. Fetch `users` row by `auth.uid()` to get business_id + role.
 *   2. Fetch the user's first active branch from `branches`.
 *   3. Auto-derive a cashier code (last 2 of user_id) until proper device
 *      pairing lands as a separate flow.
 *
 * Returns a discriminated union so the caller can render the right error UI:
 *   - `account_not_provisioned`: auth.users exists but `users` row missing
 *     (admin needs to create one).
 *   - `business_not_assigned`: `users.business_id` is null.
 *   - `no_branches_configured`: business has no active branches.
 *   - `query_failed`: network/permission error (likely RLS misconfig).
 *
 * The function is pure: it takes its supabase client + store setters as
 * arguments so it can be unit-tested with mocks.
 */

import type { UserRole } from '@tdpos/shared'

export interface BootstrapAuthInput {
  userId: string
  businessId: string
  role: UserRole
  phone?: string | null
}

export interface BootstrapDeviceInput {
  branchId: string
  branchCode: string
  branchName: string
  cashierCode: string
  storeName?: string | null
  storeAddress?: string | null
  tin?: string | null
}

export interface BootstrapStore {
  setAuth: (input: BootstrapAuthInput) => void
  setDevice: (input: BootstrapDeviceInput) => void
}

interface SessionUser {
  id: string
  phone?: string | null
}

export interface BootstrapSession {
  user: SessionUser
}

interface SupabaseUserRow {
  id: string
  business_id: string | null
  role: string | null
  phone: string | null
}

interface SupabaseBranchRow {
  id: string
  name: string
  // Optional fields that may be missing on bare-bones schemas.
  region?: string | null
  is_active?: boolean | null
}

interface SupabaseBusinessRow {
  id: string
  name: string | null
  address: string | null
  tin: string | null
}

/**
 * Minimal subset of the supabase-js client surface used by bootstrap.
 * The real `SupabaseClient` from `@supabase/supabase-js` satisfies this
 * structurally. Tests pass a mock that records calls.
 */
interface MaybeSingleResult {
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

interface OrderableQuery extends MaybeSingleResult {
  order(column: string, options: { ascending: boolean }): { limit(n: number): MaybeSingleResult }
}

export interface SupabaseBootstrapClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): OrderableQuery
    }
  }
}

export type BootstrapOutcome =
  | { ok: true; auth: BootstrapAuthInput; device: BootstrapDeviceInput }
  | {
      ok: false
      reason:
        | 'account_not_provisioned'
        | 'business_not_assigned'
        | 'no_branches_configured'
        | 'query_failed'
      message?: string
    }

/**
 * Maps a bootstrap outcome to a human-readable error message for the (auth)
 * screens. Returns null on success.
 */
export function describeBootstrapFailure(outcome: BootstrapOutcome): string | null {
  if (outcome.ok) return null
  switch (outcome.reason) {
    case 'account_not_provisioned':
      return 'Your account is not set up yet. Ask your manager to add you to a business.'
    case 'business_not_assigned':
      return 'No business is assigned to your account. Contact your manager.'
    case 'no_branches_configured':
      return 'No active branch found for your business. Ask your manager to add one.'
    case 'query_failed':
      return outcome.message
        ? `Could not load your account: ${outcome.message}`
        : 'Could not load your account. Check your connection and try again.'
  }
}

const ROLE_FALLBACK: UserRole = 'cashier'
const VALID_ROLES = new Set<UserRole>(['owner', 'manager', 'cashier', 'tindera'])

function isValidRole(role: string | null): role is UserRole {
  return role !== null && VALID_ROLES.has(role as UserRole)
}

function deriveCashierCode(userId: string): string {
  // Last 2 hex chars of the UUID, uppercased and prefixed with C. Stable,
  // device-stable, and unlikely to collide for the small staff sizes typical
  // of v0.1alpha pilots. Replace with proper device-pairing flow before v1.0.
  const tail = userId.replace(/-/g, '').slice(-2).toUpperCase()
  return `C${tail || '01'}`
}

function deriveBranchCode(branch: SupabaseBranchRow): string {
  // Generate a 4-char branch code from the branch name's first letters; if
  // we can't derive anything sensible, fall back to the row id's last 4.
  const initials = branch.name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean)
    .join('')
    .slice(0, 4)

  if (initials.length >= 2) return initials.padEnd(3, '0')

  const tail = branch.id.replace(/-/g, '').slice(-4).toUpperCase()
  return tail || 'BR01'
}

export async function bootstrapAuthFromSession(params: {
  supabase: SupabaseBootstrapClient
  session: BootstrapSession
  store: BootstrapStore
}): Promise<BootstrapOutcome> {
  const { supabase, session, store } = params
  const userId = session.user.id

  // 1. Fetch users row.
  const userRes = await supabase
    .from('users')
    .select('id, business_id, role, phone')
    .eq('id', userId)
    .maybeSingle()

  if (userRes.error) {
    return { ok: false, reason: 'query_failed', message: userRes.error.message }
  }
  const userRow = userRes.data as SupabaseUserRow | null
  if (!userRow) {
    return { ok: false, reason: 'account_not_provisioned' }
  }
  if (!userRow.business_id) {
    return { ok: false, reason: 'business_not_assigned' }
  }

  const role: UserRole = isValidRole(userRow.role) ? userRow.role : ROLE_FALLBACK
  const phone = session.user.phone ?? userRow.phone ?? null

  // 2. Fetch the first active branch.
  const branchRes = await supabase
    .from('branches')
    .select('id, name, region, is_active')
    .eq('business_id', userRow.business_id)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (branchRes.error) {
    return { ok: false, reason: 'query_failed', message: branchRes.error.message }
  }
  const branchRow = branchRes.data as SupabaseBranchRow | null
  if (!branchRow) {
    return { ok: false, reason: 'no_branches_configured' }
  }

  // 3. Fetch business metadata (best-effort; failures here are non-fatal).
  let storeName: string | null = null
  let storeAddress: string | null = null
  let tin: string | null = null

  const businessRes = await supabase
    .from('businesses')
    .select('id, name, address, tin')
    .eq('id', userRow.business_id)
    .maybeSingle()

  if (!businessRes.error && businessRes.data) {
    const businessRow = businessRes.data as SupabaseBusinessRow
    storeName = businessRow.name
    storeAddress = businessRow.address
    tin = businessRow.tin
  }

  // 4. Populate stores.
  const auth: BootstrapAuthInput = {
    userId,
    businessId: userRow.business_id,
    role,
    phone,
  }
  const device: BootstrapDeviceInput = {
    branchId: branchRow.id,
    branchCode: deriveBranchCode(branchRow),
    branchName: branchRow.name,
    cashierCode: deriveCashierCode(userId),
    storeName,
    storeAddress,
    tin,
  }

  store.setAuth(auth)
  store.setDevice(device)

  return { ok: true, auth, device }
}
