import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

interface HourlySalesRow {
  hour: string
  sale_count: number
  gross_total: number
}

interface PaymentMixRow {
  payment_method: string
  is_utang: number
  sale_count: number
  gross_total: number
}

interface DailyTotalsRow {
  gross_total: number
  sale_count: number
  item_count: number
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
            COUNT(*) AS sale_count,
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
            COUNT(*) AS sale_count,
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
            COUNT(DISTINCT sales.id) AS sale_count,
            COALESCE(SUM(sale_items.pieces_sold), 0) AS item_count
          FROM sales
          LEFT JOIN sale_items ON sale_items.sale_id = sales.id
          WHERE date(sales.created_at, 'unixepoch', 'localtime') = ?
        `,
        [dateStr],
      )

      return {
        hourlyData,
        paymentMix,
        grossTotal: totals?.gross_total ?? 0,
        saleCount: totals?.sale_count ?? 0,
        itemCount: totals?.item_count ?? 0,
      }
    },
    staleTime: 60 * 1000,
  })
}
