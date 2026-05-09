// Pure RFC 4180 CSV builder for the BIR-ready sales export.
//
// One row per (sale × item). Sale-level fields repeat. Empty sales (no items)
// still produce a single row with empty item columns so the receipt isn't
// silently dropped from the export.
//
// Columns are deliberately "BIR-ready" — the language posture from ADR-009
// stays consistent: column names use the provisional "Receipt #" wording.
// The accredited form is forbidden until accreditation; see the deprecations
// table.

import type { SalesExportSaleRow } from '@/lib/queries/sales-export'

export const SALES_CSV_COLUMNS = [
  'Receipt #',
  'Sale ID',
  'Date',
  'Time',
  'Branch ID',
  'Cashier ID',
  'Customer ID',
  'Status',
  'Payment Method',
  'Is Utang',
  'Sale Total',
  'Product Name',
  'Pieces Sold',
  'Sold As',
  'Unit Label',
  'Unit Price',
  'Line Subtotal',
] as const

type Cell = string | number | boolean | null | undefined

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  // RFC 4180: quote when the cell contains comma, quote, CR, or LF.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatLocalDate(iso: string): string {
  // YYYY-MM-DD in the runtime's local time (in production: PH server time;
  // BIR cares about local sale date, not UTC).
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLocalTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function buildSalesCsv(sales: SalesExportSaleRow[]): string {
  const lines: string[] = [SALES_CSV_COLUMNS.map((col) => escapeCell(col)).join(',')]

  for (const sale of sales) {
    const saleCells: Cell[] = [
      sale.receipt_number,
      sale.sale_id,
      formatLocalDate(sale.created_at),
      formatLocalTime(sale.created_at),
      sale.branch_id,
      sale.user_id ?? '',
      sale.customer_id ?? '',
      sale.status,
      sale.payment_method,
      sale.is_utang ? 'true' : 'false',
      sale.total_amount.toFixed(2),
    ]

    if (sale.items.length === 0) {
      const empty: Cell[] = ['', '', '', '', '', '']
      lines.push([...saleCells, ...empty].map((c) => escapeCell(c)).join(','))
      continue
    }

    for (const item of sale.items) {
      const itemCells: Cell[] = [
        item.product_name,
        item.pieces_sold,
        item.was_sold_as,
        item.product_unit_label ?? '',
        item.unit_price.toFixed(2),
        item.subtotal.toFixed(2),
      ]
      lines.push([...saleCells, ...itemCells].map((c) => escapeCell(c)).join(','))
    }
  }

  return `${lines.join('\r\n')}\r\n`
}

export function buildSalesCsvFilename(from: Date, to: Date): string {
  const stamp = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return `tdpos-sales-${stamp(from)}-${stamp(to)}.csv`
}
