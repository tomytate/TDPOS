import type { AsyncSqliteLike } from '@/db/async-sqlite'
import {
  executeCheckout,
  type ExecuteCheckoutCart,
  type ExecuteCheckoutDevice,
} from '@/features/sales/lib/execute-checkout'
import { processSyncQueue, type SyncCallables } from '@/services/sync-processor'
import type { PaymentMethod, SoldAs } from '@tdpos/shared'

export const PILOT_DAY_SIMULATION_SALE_COUNT = 100
export const PILOT_DAY_SYNC_BATCH_SIZE = 50

export interface PilotSimulationProduct {
  id: string
  name: string
  pricePerPiece: number
  stockPieces: number
  piecesPerPack: number
  pricePerPack?: number | null
}

export interface PilotSimulationSaleLine {
  productId: string
  qty: number
  soldAs?: SoldAs
}

export interface PilotSimulationSale {
  clientOperationId: string
  minuteOffset: number
  lines: PilotSimulationSaleLine[]
  paymentMethod?: PaymentMethod
  tendered?: number
  cashierCode?: string
}

export interface PilotDaySimulationParams {
  db: AsyncSqliteLike
  businessId: string
  branchId: string
  branchCode: string
  cashierCode: string
  userId?: string | null
  products?: PilotSimulationProduct[]
  sales?: PilotSimulationSale[]
  startAt?: Date
  drainSyncQueue?: boolean
}

export interface PilotDaySimulationResult {
  attemptedSales: number
  completedSales: number
  failedSales: Array<{
    clientOperationId: string
    reason: string
  }>
  queuedRowsBeforeDrain: number
  syncCycles: number
  syncedRows: number
  remainingUnsyncedRows: number
  saleRows: number
  saleItemRows: number
  inventoryLogRows: number
  uniqueReceiptCount: number
  expectedStockByProduct: Record<string, number>
  actualStockByProduct: Record<string, number>
}

interface ProductRow {
  id: string
  name: string
  price_per_piece: number
  price_per_pack: number | null
  pieces_per_pack: number
  stock_pieces: number
}

interface CountRow {
  count: number
}

interface ProductStockRow {
  id: string
  stock_pieces: number
}

export const PILOT_DAY_SIMULATION_PRODUCTS: PilotSimulationProduct[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Pilot Shampoo Sachet',
    pricePerPiece: 7,
    stockPieces: 240,
    piecesPerPack: 12,
    pricePerPack: 75,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Pilot Coffee Sachet',
    pricePerPiece: 8,
    stockPieces: 220,
    piecesPerPack: 10,
    pricePerPack: 75,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Pilot Instant Noodles',
    pricePerPiece: 15,
    stockPieces: 180,
    piecesPerPack: 6,
    pricePerPack: 85,
  },
]

export async function seedPilotDaySimulationCatalog(
  db: AsyncSqliteLike,
  businessId: string,
  products: PilotSimulationProduct[] = PILOT_DAY_SIMULATION_PRODUCTS,
): Promise<void> {
  for (const product of products) {
    await db.runAsync(
      `INSERT INTO products (
         id, business_id, name, price_per_piece, price_per_pack, stock_pieces,
         pieces_per_pack, reorder_point_pieces, unit_label, is_tingi, is_active, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pc', 1, 1, unixepoch())
       ON CONFLICT(id) DO UPDATE SET
         business_id = excluded.business_id,
         name = excluded.name,
         price_per_piece = excluded.price_per_piece,
         price_per_pack = excluded.price_per_pack,
         stock_pieces = excluded.stock_pieces,
         pieces_per_pack = excluded.pieces_per_pack,
         reorder_point_pieces = excluded.reorder_point_pieces,
         unit_label = excluded.unit_label,
         is_tingi = excluded.is_tingi,
         is_active = excluded.is_active,
         updated_at = unixepoch()`,
      [
        product.id,
        businessId,
        product.name,
        product.pricePerPiece,
        product.pricePerPack ?? null,
        product.stockPieces,
        product.piecesPerPack,
        Math.max(1, Math.floor(product.stockPieces * 0.15)),
      ],
    )
  }
}

export function buildPilotDaySalesPlan(
  products: PilotSimulationProduct[] = PILOT_DAY_SIMULATION_PRODUCTS,
  count = PILOT_DAY_SIMULATION_SALE_COUNT,
): PilotSimulationSale[] {
  if (products.length === 0) return []

  return Array.from({ length: count }, (_, index) => {
    const primary = products[index % products.length] as PilotSimulationProduct

    return {
      clientOperationId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      minuteOffset: index * 4,
      lines: [
        {
          productId: primary.id,
          qty: index % 5 === 0 ? 2 : 1,
          soldAs: 'piece',
        },
      ],
      paymentMethod: index % 7 === 0 ? 'gcash' : 'cash',
      cashierCode: index % 2 === 0 ? 'C01' : 'C02',
    }
  })
}

export async function runPilotDaySimulation(
  params: PilotDaySimulationParams,
): Promise<PilotDaySimulationResult> {
  const {
    db,
    businessId,
    branchId,
    branchCode,
    cashierCode,
    userId = null,
    products = PILOT_DAY_SIMULATION_PRODUCTS,
    sales = buildPilotDaySalesPlan(products),
    startAt = new Date('2026-05-15T00:00:00.000Z'),
    drainSyncQueue = true,
  } = params

  const productsById = new Map<string, ProductRow>()
  const expectedStockByProduct = Object.fromEntries(
    products.map((product) => [product.id, product.stockPieces]),
  )
  const failedSales: PilotDaySimulationResult['failedSales'] = []

  for (const product of await loadProducts(db, products)) {
    productsById.set(product.id, product)
    expectedStockByProduct[product.id] = product.stock_pieces
  }

  for (const sale of sales) {
    const cart = buildSimulationCart(sale, productsById)
    const device: ExecuteCheckoutDevice = {
      branchId,
      branchCode,
      cashierCode: sale.cashierCode ?? cashierCode,
      userId,
      businessId,
    }
    const result = await executeCheckout({
      db,
      clientOperationId: sale.clientOperationId,
      cart,
      device,
      now: () => new Date(startAt.getTime() + sale.minuteOffset * 60_000),
    })

    if (!result.ok) {
      failedSales.push({
        clientOperationId: sale.clientOperationId,
        reason: result.reason,
      })
      continue
    }

    for (const line of sale.lines) {
      const product = productsById.get(line.productId)
      if (!product) continue
      const piecesSold =
        line.qty * ((line.soldAs ?? 'piece') === 'pack' ? product.pieces_per_pack : 1)
      expectedStockByProduct[line.productId] =
        (expectedStockByProduct[line.productId] ?? product.stock_pieces) - piecesSold
    }
  }

  const queuedRowsBeforeDrain = await countRows(
    db,
    `SELECT COUNT(*) AS count FROM sync_queue WHERE synced_at IS NULL`,
  )
  const drainResult = drainSyncQueue
    ? await drainSimulationSyncQueue(db)
    : { syncCycles: 0, syncedRows: 0 }
  const actualStockByProduct = await loadActualStockByProduct(db, products)

  return {
    attemptedSales: sales.length,
    completedSales: sales.length - failedSales.length,
    failedSales,
    queuedRowsBeforeDrain,
    syncCycles: drainResult.syncCycles,
    syncedRows: drainResult.syncedRows,
    remainingUnsyncedRows: await countRows(
      db,
      `SELECT COUNT(*) AS count FROM sync_queue WHERE synced_at IS NULL`,
    ),
    saleRows: await countRows(db, `SELECT COUNT(*) AS count FROM sales`),
    saleItemRows: await countRows(db, `SELECT COUNT(*) AS count FROM sale_items`),
    inventoryLogRows: await countRows(db, `SELECT COUNT(*) AS count FROM inventory_logs`),
    uniqueReceiptCount: await countRows(
      db,
      `SELECT COUNT(DISTINCT receipt_number) AS count FROM sales`,
    ),
    expectedStockByProduct,
    actualStockByProduct,
  }
}

async function loadProducts(
  db: AsyncSqliteLike,
  products: PilotSimulationProduct[],
): Promise<ProductRow[]> {
  const rows: ProductRow[] = []

  for (const product of products) {
    const row = await db.getFirstAsync<ProductRow>(
      `SELECT id, name, price_per_piece, price_per_pack, pieces_per_pack, stock_pieces
       FROM products
       WHERE id = ? AND is_active = 1`,
      [product.id],
    )
    if (row) rows.push(row)
  }

  return rows
}

function buildSimulationCart(
  sale: PilotSimulationSale,
  productsById: Map<string, ProductRow>,
): ExecuteCheckoutCart {
  const items = sale.lines.map((line) => {
    const product = productsById.get(line.productId)
    if (!product) {
      throw new Error(`simulation product missing: ${line.productId}`)
    }

    const wasSoldAs = line.soldAs ?? 'piece'
    const unitPrice =
      wasSoldAs === 'pack' && product.price_per_pack !== null
        ? product.price_per_pack
        : product.price_per_piece

    return {
      productId: product.id,
      name: product.name,
      qty: line.qty,
      unitPrice,
      wasSoldAs,
      piecesPerPack: product.pieces_per_pack,
      lineTotal: line.qty * unitPrice,
    }
  })
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)

  return {
    items,
    total,
    tendered: sale.tendered ?? total + (sale.paymentMethod === 'cash' ? 20 : 0),
    paymentMethod: sale.paymentMethod ?? 'cash',
    isUtang: false,
  }
}

async function drainSimulationSyncQueue(db: AsyncSqliteLike) {
  const callables: SyncCallables = {
    async applyInventoryDelta() {
      return { data: { ok: true }, error: null }
    },
    async createSale() {
      return { data: { ok: true }, error: null }
    },
  }
  let syncCycles = 0
  let syncedRows = 0

  while (syncCycles < 20) {
    const result = await processSyncQueue({
      db,
      callables,
      batchSize: PILOT_DAY_SYNC_BATCH_SIZE,
      now: () => 1_779_000_000 + syncCycles,
    })

    if (result.total === 0) break

    syncCycles += 1
    syncedRows += result.synced

    if (result.failed > 0 || result.deferred > 0 || result.reviewable > 0) break
  }

  return { syncCycles, syncedRows }
}

async function loadActualStockByProduct(
  db: AsyncSqliteLike,
  products: PilotSimulationProduct[],
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<ProductStockRow>(
    `SELECT id, stock_pieces
     FROM products
     WHERE id IN (${products.map(() => '?').join(', ')})
     ORDER BY id`,
    products.map((product) => product.id),
  )

  return Object.fromEntries(rows.map((row) => [row.id, row.stock_pieces]))
}

async function countRows(db: AsyncSqliteLike, sql: string): Promise<number> {
  const row = await db.getFirstAsync<CountRow>(sql, [])
  return Number(row?.count ?? 0)
}
