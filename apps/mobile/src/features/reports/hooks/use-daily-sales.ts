import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import type { PaymentMethod, SoldAs } from '@tdpos/shared'

interface HourlySalesRow {
  hour: string
  sale_count: number
  void_count: number
  gross_total: number
}

interface PaymentMixRow {
  payment_method: string
  is_utang: number
  sale_count: number
  void_count: number
  gross_total: number
}

interface DailyTotalsRow {
  gross_total: number
  sale_count: number
  void_count: number
  item_count: number
}

interface ReceiptSaleRow {
  id: string
  receipt_number: string
  total_amount: number
  payment_method: PaymentMethod
  status: string
  is_utang: number
  created_at: number
  original_receipt_number: string | null
}

interface ReceiptItemRow {
  name: string | null
  pieces_sold: number
  was_sold_as: SoldAs
  unit_price: number
  subtotal: number
  pieces_per_pack: number | null
}

export interface DailyReceiptItem {
  name: string
  qty: number
  wasSoldAs: SoldAs
  unitPrice: number
  lineTotal: number
}

export interface DailyReceiptSummary {
  saleId: string
  receiptNumber: string
  originalReceiptNumber: string | null
  total: number
  paymentMethod: PaymentMethod
  status: string
  isUtang: boolean
  createdAt: number
  items: DailyReceiptItem[]
}

export function useDailySales(dateStr: string) {
  const db = useSQLiteContext()

  return useQuery({
    queryKey: ['daily-sales', dateStr],
    queryFn: async () => {
      const hourlyData = await db.getAllAsync<HourlySalesRow>(
        `
          SELECT
            strftime('%H', created_at, 'unixepoch', 'localtime') AS hour,
            SUM(CASE WHEN status = 'voided' THEN 0 ELSE 1 END) AS sale_count,
            SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) AS void_count,
            COALESCE(SUM(total_amount), 0) AS gross_total
          FROM sales
          WHERE date(created_at, 'unixepoch', 'localtime') = ?
          GROUP BY hour
          ORDER BY hour
        `,
        [dateStr],
      )

      const paymentMix = await db.getAllAsync<PaymentMixRow>(
        `
          SELECT
            payment_method,
            is_utang,
            SUM(CASE WHEN status = 'voided' THEN 0 ELSE 1 END) AS sale_count,
            SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) AS void_count,
            COALESCE(SUM(total_amount), 0) AS gross_total
          FROM sales
          WHERE date(created_at, 'unixepoch', 'localtime') = ?
          GROUP BY payment_method, is_utang
          ORDER BY gross_total DESC
        `,
        [dateStr],
      )

      const totals = await db.getFirstAsync<DailyTotalsRow>(
        `
          SELECT
            COALESCE(SUM(sales.total_amount), 0) AS gross_total,
            COUNT(DISTINCT CASE WHEN sales.status = 'voided' THEN NULL ELSE sales.id END) AS sale_count,
            COUNT(DISTINCT CASE WHEN sales.status = 'voided' THEN sales.id ELSE NULL END) AS void_count,
            COALESCE(SUM(sale_items.pieces_sold), 0) AS item_count
          FROM sales
          LEFT JOIN sale_items ON sale_items.sale_id = sales.id
          WHERE date(sales.created_at, 'unixepoch', 'localtime') = ?
        `,
        [dateStr],
      )

      const receiptRows = await db.getAllAsync<ReceiptSaleRow>(
        `
          SELECT
            sales.id,
            sales.receipt_number,
            sales.total_amount,
            sales.payment_method,
            sales.status,
            sales.is_utang,
            sales.created_at,
            original_sales.receipt_number AS original_receipt_number
          FROM sales
          LEFT JOIN sale_voids
            ON sale_voids.compensating_sale_id = sales.id
          LEFT JOIN sales AS original_sales
            ON original_sales.id = sale_voids.original_sale_id
          WHERE date(sales.created_at, 'unixepoch', 'localtime') = ?
          ORDER BY sales.created_at DESC, sales.receipt_number DESC
          LIMIT 20
        `,
        [dateStr],
      )

      const recentReceipts: DailyReceiptSummary[] = []
      for (const receipt of receiptRows) {
        const itemRows = await db.getAllAsync<ReceiptItemRow>(
          `
            SELECT
              products.name,
              sale_items.pieces_sold,
              sale_items.was_sold_as,
              sale_items.unit_price,
              sale_items.subtotal,
              products.pieces_per_pack
            FROM sale_items
            LEFT JOIN products ON products.id = sale_items.product_id
            WHERE sale_items.sale_id = ?
            ORDER BY sale_items.rowid
          `,
          [receipt.id],
        )

        recentReceipts.push({
          saleId: receipt.id,
          receiptNumber: receipt.receipt_number,
          originalReceiptNumber: receipt.original_receipt_number,
          total: receipt.total_amount,
          paymentMethod: receipt.payment_method,
          status: receipt.status,
          isUtang: receipt.is_utang === 1,
          createdAt: receipt.created_at,
          items: itemRows.map((item) => {
            const pieces = Math.abs(item.pieces_sold)
            const piecesPerPack = Math.max(1, item.pieces_per_pack ?? 1)
            return {
              name: item.name ?? 'Unknown product',
              qty: item.was_sold_as === 'pack' ? pieces / piecesPerPack : pieces,
              wasSoldAs: item.was_sold_as,
              unitPrice: item.unit_price,
              lineTotal: item.subtotal,
            }
          }),
        })
      }

      return {
        hourlyData,
        paymentMix,
        grossTotal: totals?.gross_total ?? 0,
        saleCount: totals?.sale_count ?? 0,
        voidCount: totals?.void_count ?? 0,
        itemCount: totals?.item_count ?? 0,
        recentReceipts,
      }
    },
    staleTime: 60 * 1000,
  })
}
