import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'
import type { SyncCallables } from './sync-processor'

import { createSyncRunner } from './sync-runner'

function makeAdapter(sqlite: Database): AsyncSqliteLike {
  return {
    async runAsync(sql, params) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: unknown[]) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: unknown[]) {
      return sqlite.prepare(sql).all(...(params as never[])) as T[]
    },
    async withTransactionAsync(fn) {
      sqlite.exec('BEGIN')
      try {
        await fn()
        sqlite.exec('COMMIT')
      } catch (err) {
        sqlite.exec('ROLLBACK')
        throw err
      }
    },
  }
}

function freshDb(): { sqlite: Database; db: AsyncSqliteLike } {
  const sqlite = new Database(':memory:')
  sqlite.exec(LOCAL_SCHEMA_SQL)
  return { sqlite, db: makeAdapter(sqlite) }
}

function makeNoopCallables(): SyncCallables {
  return {
    applyInventoryDelta: async () => ({ data: { ok: true }, error: null }),
    createSale: async () => ({ data: { ok: true }, error: null }),
  }
}

describe('createSyncRunner', () => {
  test('runs processSyncQueue and returns the result on first call', async () => {
    const { db } = freshDb()
    const runner = createSyncRunner({ db, callables: makeNoopCallables() })

    const outcome = await runner.run()
    expect(outcome.skipped).toBe(false)
    if (outcome.skipped) return
    expect(outcome.result).toEqual({
      total: 0,
      synced: 0,
      failed: 0,
      deferred: 0,
      reviewable: 0,
    })
    expect(runner.isInFlight()).toBe(false)
  })

  test('returns { skipped: true } when invoked while another run is in flight', async () => {
    let resolveDeltaCall: () => void = () => {}
    const callables: SyncCallables = {
      applyInventoryDelta: async () =>
        new Promise((resolve) => {
          resolveDeltaCall = () => resolve({ data: { ok: true }, error: null })
        }),
      createSale: async () => ({ data: { ok: true }, error: null }),
    }

    // Seed a single delta row so the processor will actually call applyInventoryDelta.
    const { sqlite } = (() => {
      const inner = freshDb()
      inner.sqlite
        .prepare(
          `INSERT INTO sync_queue (client_operation_id, table_name, record_id, operation, payload, created_at)
           VALUES (?, 'products', ?, 'DELTA', ?, unixepoch())`,
        )
        .run(
          '00000000-0000-4000-8000-000000000001',
          '11111111-1111-4111-8111-111111111111',
          JSON.stringify({
            client_operation_id: '00000000-0000-4000-8000-000000000001',
            product_id: '11111111-1111-4111-8111-111111111111',
            branch_id: '22222222-2222-4222-8222-222222222222',
            delta: -1,
            reason: 'sale',
          }),
        )
      return inner
    })()

    const runner = createSyncRunner({ db: makeAdapter(sqlite), callables })

    const first = runner.run()
    // Microtask boundary so the runner sets inFlight = true before the next call.
    await Promise.resolve()
    expect(runner.isInFlight()).toBe(true)

    const second = await runner.run()
    expect(second.skipped).toBe(true)

    // Let the first run finish.
    resolveDeltaCall()
    await first
    expect(runner.isInFlight()).toBe(false)

    // After the lock releases, a fresh call goes through.
    const third = await runner.run()
    expect(third.skipped).toBe(false)
  })

  test('shares the in-flight lock across runner instances', async () => {
    let resolveDeltaCall: () => void = () => {}
    const callables: SyncCallables = {
      applyInventoryDelta: async () =>
        new Promise((resolve) => {
          resolveDeltaCall = () => resolve({ data: { ok: true }, error: null })
        }),
      createSale: async () => ({ data: { ok: true }, error: null }),
    }

    const { sqlite, db } = freshDb()
    sqlite
      .prepare(
        `INSERT INTO sync_queue (client_operation_id, table_name, record_id, operation, payload, created_at)
         VALUES (?, 'products', ?, 'DELTA', ?, unixepoch())`,
      )
      .run(
        '00000000-0000-4000-8000-000000000011',
        '11111111-1111-4111-8111-111111111111',
        JSON.stringify({
          client_operation_id: '00000000-0000-4000-8000-000000000011',
          product_id: '11111111-1111-4111-8111-111111111111',
          branch_id: '22222222-2222-4222-8222-222222222222',
          delta: -1,
          reason: 'sale',
        }),
      )

    const foregroundRunner = createSyncRunner({ db, callables })
    const backgroundRunner = createSyncRunner({ db, callables })

    const foreground = foregroundRunner.run()
    await Promise.resolve()

    const background = await backgroundRunner.run()
    expect(background.skipped).toBe(true)
    expect(backgroundRunner.isInFlight()).toBe(true)

    resolveDeltaCall()
    await foreground
    expect(backgroundRunner.isInFlight()).toBe(false)
  })

  test('releases the in-flight lock even if processSyncQueue throws', async () => {
    const callables: SyncCallables = {
      applyInventoryDelta: async () => ({ data: { ok: true }, error: null }),
      createSale: async () => ({ data: { ok: true }, error: null }),
    }

    // Force `processSyncQueue` to throw by handing it a broken db adapter.
    const broken: AsyncSqliteLike = {
      runAsync: () => Promise.reject(new Error('db gone')),
      getFirstAsync: () => Promise.reject(new Error('db gone')),
      getAllAsync: () => Promise.reject(new Error('db gone')),
      withTransactionAsync: () => Promise.reject(new Error('db gone')),
    }
    const brokenRunner = createSyncRunner({ db: broken, callables })

    let threw = false
    try {
      await brokenRunner.run()
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
    expect(brokenRunner.isInFlight()).toBe(false)
  })
})
