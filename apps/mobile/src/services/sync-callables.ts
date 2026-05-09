/**
 * Bridge between the abstract `SyncCallables` interface (used by the sync
 * processor and unit-tested under bun:sqlite) and the real Supabase JS client.
 *
 * Routes:
 *   - `applyInventoryDelta` → `supabase.rpc('apply_inventory_delta', params)`
 *   - `createSale`          → `supabase.functions.invoke('create-sale', { body })`
 *
 * The adapter is a thin shim. It does not retry, does not validate, and does
 * not serialize. Validation lives in the sync processor (Zod) and in the
 * Edge Function (Zod). Retry policy lives in the sync processor. Serialization
 * is the supabase-js client's job.
 *
 * Decoupling rationale: keeping the adapter trivial means we can swap the
 * underlying transport (REST, Edge Function, RPC) in one place without
 * touching the processor or its 6 integration tests.
 */

import type { SyncCallables, SyncRpcResponse } from './sync-processor'

/**
 * Minimal subset of the supabase-js v2 client surface used by the adapter.
 * The real `SupabaseClient` from `@supabase/supabase-js` satisfies this
 * structurally, so passing it at runtime requires no cast.
 */
export interface SupabaseRpcLike {
  // `PromiseLike` (not `Promise`) so the real supabase-js client's
  // `PostgrestFilterBuilder` — a thenable that resolves to `{ data, error }`
  // — satisfies this shape without a cast.
  rpc<T = unknown>(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: T | null; error: { message: string } | null }>
  functions: {
    invoke<T = unknown>(
      name: string,
      options: { body: unknown },
    ): PromiseLike<{ data: T | null; error: { message: string } | null }>
  }
}

export function createSyncCallables(supabase: SupabaseRpcLike): SyncCallables {
  return {
    async applyInventoryDelta(params) {
      return supabase.rpc<SyncRpcResponse>('apply_inventory_delta', params)
    },
    async createSale(payload) {
      return supabase.functions.invoke<SyncRpcResponse>('create-sale', {
        body: payload,
      })
    },
  }
}
