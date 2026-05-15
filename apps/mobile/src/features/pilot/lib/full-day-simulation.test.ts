import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteBindParams } from '@/db/async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import {
  buildPilotDaySalesPlan,
  PILOT_DAY_SIMULATION_PRODUCTS,
  runPilotDaySimulation,
  seedPilotDaySimulationCatalog,
} from './full-day-simulation'

const BUSINESS_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BRANCH_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function makeAdapter(sqlite: Database): LocalMigrationDb {
  return {
    async execAsync(sql) {
      sqlite.exec(sql)
    },
    async runAsync(sql, params: AsyncSqliteBindParams = []) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: AsyncSqliteBindParams = []) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: AsyncSqliteBindParams = []) {
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

async function freshDb() {
  const sqlite = new Database(':memory:')
  const db = makeAdapter(sqlite)
  await runLocalMigrations(db)
  return { sqlite, db }
}

describe('pilot full-day simulation', () => {
  test('runs 100 offline sales and drains the local sync queue in four batches', async () => {
    const { db } = await freshDb()
    await seedPilotDaySimulationCatalog(db, BUSINESS_ID)

    const result = await runPilotDaySimulation({
      db,
      businessId: BUSINESS_ID,
      branchId: BRANCH_ID,
      branchCode: 'QC01',
      cashierCode: 'C01',
      userId: USER_ID,
    })

    expect(result.attemptedSales).toBe(100)
    expect(result.completedSales).toBe(100)
    expect(result.failedSales).toEqual([])
    expect(result.saleRows).toBe(100)
    expect(result.saleItemRows).toBe(100)
    expect(result.inventoryLogRows).toBe(100)
    expect(result.uniqueReceiptCount).toBe(100)
    expect(result.queuedRowsBeforeDrain).toBe(200)
    expect(result.syncCycles).toBe(4)
    expect(result.syncedRows).toBe(200)
    expect(result.remainingUnsyncedRows).toBe(0)
    expect(result.actualStockByProduct).toEqual(result.expectedStockByProduct)
  })

  test('reports failed sales instead of hiding stock shortages', async () => {
    const { db } = await freshDb()
    const firstProduct = PILOT_DAY_SIMULATION_PRODUCTS[0]!
    const products = [
      {
        ...firstProduct,
        stockPieces: 2,
      },
    ]
    await seedPilotDaySimulationCatalog(db, BUSINESS_ID, products)

    const result = await runPilotDaySimulation({
      db,
      businessId: BUSINESS_ID,
      branchId: BRANCH_ID,
      branchCode: 'QC01',
      cashierCode: 'C01',
      userId: USER_ID,
      products,
      sales: buildPilotDaySalesPlan(products, 2),
      drainSyncQueue: false,
    })

    expect(result.completedSales).toBe(1)
    expect(result.failedSales).toEqual([
      {
        clientOperationId: '00000000-0000-4000-8000-000000000002',
        reason: 'insufficient_stock',
      },
    ])
    expect(result.saleRows).toBe(1)
    expect(result.remainingUnsyncedRows).toBe(2)
    expect(result.actualStockByProduct[firstProduct.id]).toBe(0)
  })
})
