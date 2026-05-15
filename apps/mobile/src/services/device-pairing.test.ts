import { describe, expect, test } from 'bun:test'

import { consumeDevicePairingCode, type SupabaseDevicePairingClient } from './device-pairing'

function makeClient(response: {
  data?: unknown
  error?: { message: string } | null
  calls?: Array<{ name: string; params: Record<string, unknown> }>
}): SupabaseDevicePairingClient {
  return {
    rpc: (name, params) => {
      response.calls?.push({ name, params })
      return Promise.resolve({
        data: response.data ?? null,
        error: response.error ?? null,
      })
    },
  }
}

describe('consumeDevicePairingCode', () => {
  test('rejects invalid codes without calling Supabase', async () => {
    const calls: Array<{ name: string; params: Record<string, unknown> }> = []
    const outcome = await consumeDevicePairingCode({
      supabase: makeClient({ calls }),
      pairingCode: 'ABC',
      installId: 'install-1',
    })

    if (outcome.ok) throw new Error('Expected invalid code to fail')
    expect(outcome.reason).toBe('invalid_code')
    expect(calls).toHaveLength(0)
  })

  test('normalizes and parses a successful consume response', async () => {
    const calls: Array<{ name: string; params: Record<string, unknown> }> = []
    const outcome = await consumeDevicePairingCode({
      supabase: makeClient({
        calls,
        data: {
          ok: true,
          pairing_code_id: 'pair-1',
          branch_id: 'branch-1',
          branch_name: 'Main',
          branch_code: 'MAIN',
          cashier_code: 'C01',
          device_name: 'Front counter',
          surface: 'mobile.tier_a_cashier',
        },
      }),
      pairingCode: 'ab12-cd34',
      installId: 'install-1',
    })

    expect(calls[0]).toEqual({
      name: 'consume_device_pairing_code',
      params: { p_pairing_code: 'AB12CD34', p_install_id: 'install-1' },
    })
    expect(outcome).toEqual({
      ok: true,
      pairingCodeId: 'pair-1',
      branchId: 'branch-1',
      branchName: 'Main',
      branchCode: 'MAIN',
      cashierCode: 'C01',
      deviceName: 'Front counter',
      surface: 'mobile.tier_a_cashier',
    })
  })

  test('maps server failure reasons to cashier-safe messages', async () => {
    const outcome = await consumeDevicePairingCode({
      supabase: makeClient({ data: { ok: false, reason: 'not_found' } }),
      pairingCode: 'AB12CD34',
      installId: 'install-1',
    })

    if (outcome.ok) throw new Error('Expected missing code to fail')
    expect(outcome.reason).toBe('not_found')
    expect(outcome.message).toContain('expired')
  })

  test('rejects incomplete success payloads', async () => {
    const outcome = await consumeDevicePairingCode({
      supabase: makeClient({
        data: {
          ok: true,
          pairing_code_id: 'pair-1',
          branch_id: 'branch-1',
          branch_name: 'Main',
          branch_code: 'MAIN',
          cashier_code: 'C01',
          device_name: null,
          surface: 'mobile.unknown_surface',
        },
      }),
      pairingCode: 'AB12CD34',
      installId: 'install-1',
    })

    if (outcome.ok) throw new Error('Expected unknown surface to fail')
    expect(outcome.reason).toBe('query_failed')
  })

  test('surfaces transport errors verbatim', async () => {
    const outcome = await consumeDevicePairingCode({
      supabase: makeClient({ error: { message: 'network down' } }),
      pairingCode: 'AB12CD34',
      installId: 'install-1',
    })

    expect(outcome).toEqual({ ok: false, reason: 'query_failed', message: 'network down' })
  })
})
