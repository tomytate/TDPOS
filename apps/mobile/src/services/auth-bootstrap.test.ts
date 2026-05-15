import { describe, expect, test } from 'bun:test'

import {
  bootstrapAuthFromSession,
  type BootstrapAuthInput,
  type BootstrapDeviceInput,
  type BootstrapSession,
  type SupabaseBootstrapClient,
} from './auth-bootstrap'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const BUSINESS_ID = '22222222-2222-4222-8222-222222222222'
const BRANCH_ID = '33333333-3333-4333-8333-333333333333'
const PHONE = '+639170000000'

interface MockResponse {
  data: unknown
  error: { message: string } | null
}

function makeSession(): BootstrapSession {
  return { user: { id: USER_ID, phone: PHONE } }
}

function makeStore() {
  const calls = {
    auth: [] as BootstrapAuthInput[],
    device: [] as BootstrapDeviceInput[],
  }
  return {
    calls,
    store: {
      setAuth: (input: BootstrapAuthInput) => {
        calls.auth.push(input)
      },
      setDevice: (input: BootstrapDeviceInput) => {
        calls.device.push(input)
      },
    },
  }
}

interface ResponseMap {
  users?: MockResponse
  branches?: MockResponse
  businesses?: MockResponse
}

function makeClient(
  responses: ResponseMap,
  rpcResponses: Record<string, MockResponse> = {},
): SupabaseBootstrapClient {
  return {
    from(table: string) {
      const response: MockResponse = responses[table as keyof ResponseMap] ?? {
        data: null,
        error: null,
      }
      const terminal = {
        async maybeSingle() {
          return response
        },
      }
      return {
        select() {
          return {
            eq() {
              return {
                ...terminal,
                order() {
                  return { limit: () => terminal }
                },
              }
            },
            order() {
              return { limit: () => terminal }
            },
          }
        },
      }
    },
    async rpc(name: string) {
      return rpcResponses[name] ?? { data: null, error: null }
    },
  }
}

describe('bootstrapAuthFromSession', () => {
  test('populates auth + device stores on the happy path', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: { id: USER_ID, business_id: BUSINESS_ID, role: 'owner', phone: PHONE },
        error: null,
      },
      branches: {
        data: { id: BRANCH_ID, name: 'Main Branch', region: 'NCR', is_active: true },
        error: null,
      },
      businesses: {
        data: {
          id: BUSINESS_ID,
          name: 'Tindahan ni Aling Nena',
          address: 'Quezon City',
          tin: '123-456-789',
        },
        error: null,
      },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(calls.auth).toHaveLength(1)
    expect(calls.auth[0]).toMatchObject({
      userId: USER_ID,
      businessId: BUSINESS_ID,
      role: 'owner',
      phone: PHONE,
    })

    expect(calls.device).toHaveLength(1)
    expect(calls.device[0]).toMatchObject({
      branchId: BRANCH_ID,
      branchName: 'Main Branch',
      storeName: 'Tindahan ni Aling Nena',
      storeAddress: 'Quezon City',
      tin: '123-456-789',
    })
    // Branch code derived from name initials (M + B → "MB" padded).
    expect(calls.device[0]?.branchCode).toMatch(/^[A-Z0-9]{3,4}$/)
    // Cashier code derived from last 2 of user_id ("11" → "C11").
    expect(calls.device[0]?.cashierCode).toBe('C11')
  })

  test('falls back to cashier role when users.role is unknown', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: { id: USER_ID, business_id: BUSINESS_ID, role: 'admin-typo', phone: PHONE },
        error: null,
      },
      branches: { data: { id: BRANCH_ID, name: 'Main' }, error: null },
      businesses: { data: null, error: null },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calls.auth[0]?.role).toBe('cashier')
  })

  test('returns account_not_provisioned when users row is missing', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: { data: null, error: null },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('account_not_provisioned')
    expect(calls.auth).toHaveLength(0)
    expect(calls.device).toHaveLength(0)
  })

  test('returns business_not_assigned when users.business_id is null', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: { id: USER_ID, business_id: null, role: 'owner', phone: PHONE },
        error: null,
      },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('business_not_assigned')
    expect(calls.auth).toHaveLength(0)
  })

  test('returns account_inactive when staff access is disabled', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: {
          id: USER_ID,
          business_id: BUSINESS_ID,
          role: 'cashier',
          phone: PHONE,
          is_active: false,
        },
        error: null,
      },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('account_inactive')
    expect(calls.auth).toHaveLength(0)
    expect(calls.device).toHaveLength(0)
  })

  test('returns no_branches_configured when no branches exist', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: { id: USER_ID, business_id: BUSINESS_ID, role: 'owner', phone: PHONE },
        error: null,
      },
      branches: { data: null, error: null },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('no_branches_configured')
    expect(calls.auth).toHaveLength(0)
    expect(calls.device).toHaveLength(0)
  })

  test('surfaces query_failed when supabase returns an error', async () => {
    const { store } = makeStore()
    const client = makeClient({
      users: { data: null, error: { message: 'permission denied' } },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('query_failed')
    expect(result.message).toBe('permission denied')
  })

  test('still returns ok when business metadata fetch fails (non-fatal)', async () => {
    const { store, calls } = makeStore()
    const client = makeClient({
      users: {
        data: { id: USER_ID, business_id: BUSINESS_ID, role: 'owner', phone: PHONE },
        error: null,
      },
      branches: { data: { id: BRANCH_ID, name: 'Main' }, error: null },
      businesses: { data: null, error: { message: 'flaky network' } },
    })

    const result = await bootstrapAuthFromSession({
      supabase: client,
      session: makeSession(),
      store,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calls.device[0]?.storeName).toBeNull()
    expect(calls.device[0]?.storeAddress).toBeNull()
    expect(calls.device[0]?.tin).toBeNull()
  })
})
