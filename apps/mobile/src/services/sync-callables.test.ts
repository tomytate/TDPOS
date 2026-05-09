import { describe, expect, test } from 'bun:test'

import type { SyncSalePayload } from '@tdpos/shared'

import { createSyncCallables, type SupabaseRpcLike } from './sync-callables'

const OP_ID = '00000000-0000-4000-8000-000000000001'
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'
const BRANCH_ID = '22222222-2222-4222-8222-222222222222'
const SALE_ITEM_ID = '33333333-3333-4333-8333-333333333333'

interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

interface InvokeCall {
  name: string
  body: unknown
}

interface MockShape {
  client: SupabaseRpcLike
  rpcCalls: RpcCall[]
  invokeCalls: InvokeCall[]
}

function makeMock(opts: {
  rpcResponse?: { data: unknown; error: { message: string } | null }
  invokeResponse?: { data: unknown; error: { message: string } | null }
}): MockShape {
  const rpcCalls: RpcCall[] = []
  const invokeCalls: InvokeCall[] = []
  const rpcResponse = opts.rpcResponse ?? { data: { ok: true }, error: null }
  const invokeResponse = opts.invokeResponse ?? { data: { ok: true }, error: null }

  const client: SupabaseRpcLike = {
    async rpc(fn, args) {
      rpcCalls.push({ fn, args })
      return rpcResponse as { data: never; error: { message: string } | null }
    },
    functions: {
      async invoke(name, options) {
        invokeCalls.push({ name, body: options.body })
        return invokeResponse as { data: never; error: { message: string } | null }
      },
    },
  }

  return { client, rpcCalls, invokeCalls }
}

function makeSalePayload(): SyncSalePayload {
  return {
    client_operation_id: OP_ID,
    sale_id: OP_ID,
    branch_id: BRANCH_ID,
    total_amount: 21,
    payment_method: 'cash',
    is_utang: false,
    receipt_number: 'QC01-C01-20260509-000001',
    device_local_time: 1_700_000_000,
    items: [
      {
        sale_item_id: SALE_ITEM_ID,
        product_id: PRODUCT_ID,
        pieces_sold: 3,
        was_sold_as: 'piece',
        unit_price: 7,
        subtotal: 21,
      },
    ],
  }
}

describe('createSyncCallables', () => {
  test('routes applyInventoryDelta to supabase.rpc("apply_inventory_delta")', async () => {
    const mock = makeMock({
      rpcResponse: { data: { ok: true, new_stock_pieces: 5 }, error: null },
    })
    const callables = createSyncCallables(mock.client)

    const result = await callables.applyInventoryDelta({
      p_client_operation_id: OP_ID,
      p_product_id: PRODUCT_ID,
      p_branch_id: BRANCH_ID,
      p_delta: -3,
      p_reason: 'sale',
    })

    expect(mock.rpcCalls).toHaveLength(1)
    expect(mock.invokeCalls).toHaveLength(0)
    expect(mock.rpcCalls[0]?.fn).toBe('apply_inventory_delta')
    expect(mock.rpcCalls[0]?.args.p_delta).toBe(-3)
    expect(mock.rpcCalls[0]?.args.p_client_operation_id).toBe(OP_ID)
    expect(result.data).toEqual({ ok: true, new_stock_pieces: 5 })
    expect(result.error).toBeNull()
  })

  test('routes createSale to supabase.functions.invoke("create-sale")', async () => {
    const mock = makeMock({
      invokeResponse: {
        data: { ok: true, sale_id: OP_ID, receipt_number: 'QC01-C01-20260509-000001' },
        error: null,
      },
    })
    const callables = createSyncCallables(mock.client)

    const payload = makeSalePayload()
    const result = await callables.createSale(payload)

    expect(mock.invokeCalls).toHaveLength(1)
    expect(mock.rpcCalls).toHaveLength(0)
    expect(mock.invokeCalls[0]?.name).toBe('create-sale')
    expect(mock.invokeCalls[0]?.body).toEqual(payload)
    expect(result.data).toMatchObject({ ok: true })
  })

  test('surfaces transport errors verbatim from the rpc and invoke layers', async () => {
    const mockRpc = makeMock({
      rpcResponse: { data: null, error: { message: 'tenant_violation' } },
    })
    const callablesRpc = createSyncCallables(mockRpc.client)
    const deltaResult = await callablesRpc.applyInventoryDelta({
      p_client_operation_id: OP_ID,
      p_product_id: PRODUCT_ID,
      p_branch_id: BRANCH_ID,
      p_delta: -1,
      p_reason: 'sale',
    })
    expect(deltaResult.error?.message).toBe('tenant_violation')

    const mockInvoke = makeMock({
      invokeResponse: { data: null, error: { message: 'invoke failed' } },
    })
    const callablesInvoke = createSyncCallables(mockInvoke.client)
    const saleResult = await callablesInvoke.createSale(makeSalePayload())
    expect(saleResult.error?.message).toBe('invoke failed')
  })

  test('forwards the optional p_sale_id when present (sale → delta cross-reference)', async () => {
    const mock = makeMock({})
    const callables = createSyncCallables(mock.client)

    await callables.applyInventoryDelta({
      p_client_operation_id: OP_ID,
      p_product_id: PRODUCT_ID,
      p_branch_id: BRANCH_ID,
      p_delta: -1,
      p_reason: 'sale',
      p_sale_id: OP_ID,
    })

    expect(mock.rpcCalls[0]?.args.p_sale_id).toBe(OP_ID)
  })
})
