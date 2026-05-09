import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import type { SalesExportSaleRow } from '@/lib/queries/sales-export'
import { APP_BRANDING_FOOTER, BIR_RECEIPT_FOOTER, BIR_RECEIPT_HEADER } from '@tdpos/shared'
import { formatMoney } from '@tdpos/shared'

const styles = StyleSheet.create({
  page: {
    padding: 28,
    color: '#1c1917',
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.35,
  },
  header: {
    borderBottomColor: '#0f766e',
    borderBottomWidth: 1.5,
    marginBottom: 14,
    paddingBottom: 10,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    color: '#57534e',
    fontSize: 9,
    marginTop: 4,
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
    borderRadius: 4,
    borderWidth: 1,
    flexGrow: 1,
    padding: 8,
  },
  summaryLabel: {
    color: '#78716c',
    fontSize: 7,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: 700,
    marginTop: 3,
  },
  table: {
    borderColor: '#d6d3d1',
    borderTopWidth: 1,
  },
  row: {
    borderBottomColor: '#e7e5e4',
    borderBottomWidth: 1,
    display: 'flex',
    flexDirection: 'row',
    minHeight: 22,
  },
  headerCell: {
    backgroundColor: '#f5f5f4',
    color: '#44403c',
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 4,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  receipt: {
    width: '18%',
  },
  date: {
    width: '14%',
  },
  product: {
    width: '28%',
  },
  qty: {
    width: '10%',
  },
  payment: {
    width: '12%',
  },
  money: {
    textAlign: 'right',
    width: '18%',
  },
  muted: {
    color: '#78716c',
  },
  footer: {
    borderTopColor: '#e7e5e4',
    borderTopWidth: 1,
    color: '#57534e',
    fontSize: 8,
    marginTop: 16,
    paddingTop: 8,
  },
})

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const date = d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time = d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

function formatDateRange(from: Date, to: Date): string {
  const opts = { year: 'numeric', month: 'short', day: '2-digit' } as const
  return `${from.toLocaleDateString('en-PH', opts)} to ${to.toLocaleDateString('en-PH', opts)}`
}

function formatPayment(method: string, isUtang: boolean): string {
  const label = method === 'gcash' ? 'GCash' : method.charAt(0).toUpperCase() + method.slice(1)
  return isUtang ? `${label} / Utang` : label
}

function countLineItems(sales: SalesExportSaleRow[]): number {
  return sales.reduce((total, sale) => total + Math.max(1, sale.items.length), 0)
}

function SalesReportDocument({
  from,
  sales,
  to,
}: {
  from: Date
  sales: SalesExportSaleRow[]
  to: Date
}) {
  const gross = sales.reduce((total, sale) => total + sale.total_amount, 0)
  const lineCount = countLineItems(sales)

  return (
    <Document
      author="TD POS"
      creator="TD POS"
      producer="TD POS"
      subject="BIR-ready sales export"
      title="TD POS Sales Export"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{BIR_RECEIPT_HEADER}</Text>
          <Text style={styles.title}>TD POS Sales Export</Text>
          <Text style={styles.subtitle}>
            {formatDateRange(from, to)} · {BIR_RECEIPT_FOOTER}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gross sales</Text>
            <Text style={styles.summaryValue}>{formatMoney(gross)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receipts</Text>
            <Text style={styles.summaryValue}>{String(sales.length)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Line rows</Text>
            <Text style={styles.summaryValue}>{String(lineCount)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View fixed style={styles.row}>
            <Text style={[styles.headerCell, styles.receipt]}>Receipt #</Text>
            <Text style={[styles.headerCell, styles.date]}>Date / time</Text>
            <Text style={[styles.headerCell, styles.product]}>Product</Text>
            <Text style={[styles.headerCell, styles.qty]}>Pieces</Text>
            <Text style={[styles.headerCell, styles.payment]}>Payment</Text>
            <Text style={[styles.headerCell, styles.money]}>Amount</Text>
          </View>

          {sales.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.product, styles.muted]}>
                No sales found for this date range.
              </Text>
            </View>
          ) : (
            sales.flatMap((sale) => {
              if (sale.items.length === 0) {
                return [
                  <View key={`${sale.sale_id}-empty`} style={styles.row}>
                    <Text style={[styles.cell, styles.receipt]}>{sale.receipt_number}</Text>
                    <Text style={[styles.cell, styles.date]}>
                      {formatDateTime(sale.created_at)}
                    </Text>
                    <Text style={[styles.cell, styles.product, styles.muted]}>No line items</Text>
                    <Text style={[styles.cell, styles.qty]}>0</Text>
                    <Text style={[styles.cell, styles.payment]}>
                      {formatPayment(sale.payment_method, sale.is_utang)}
                    </Text>
                    <Text style={[styles.cell, styles.money]}>
                      {formatMoney(sale.total_amount)}
                    </Text>
                  </View>,
                ]
              }

              return sale.items.map((item) => (
                <View key={item.sale_item_id} style={styles.row}>
                  <Text style={[styles.cell, styles.receipt]}>{sale.receipt_number}</Text>
                  <Text style={[styles.cell, styles.date]}>{formatDateTime(sale.created_at)}</Text>
                  <Text style={[styles.cell, styles.product]}>{item.product_name}</Text>
                  <Text style={[styles.cell, styles.qty]}>{String(item.pieces_sold)}</Text>
                  <Text style={[styles.cell, styles.payment]}>
                    {formatPayment(sale.payment_method, sale.is_utang)}
                  </Text>
                  <Text style={[styles.cell, styles.money]}>{formatMoney(item.subtotal)}</Text>
                </View>
              ))
            })
          )}
        </View>

        <Text
          fixed
          render={({ pageNumber, totalPages }) =>
            `${APP_BRANDING_FOOTER} · ${BIR_RECEIPT_FOOTER} · Page ${pageNumber} of ${totalPages}`
          }
          style={styles.footer}
        />
      </Page>
    </Document>
  )
}

function stamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function buildSalesPdfFilename(from: Date, to: Date): string {
  return `tdpos-sales-${stamp(from)}-${stamp(to)}.pdf`
}

export async function buildSalesPdfBuffer(params: {
  from: Date
  sales: SalesExportSaleRow[]
  to: Date
}): Promise<Buffer> {
  return renderToBuffer(
    <SalesReportDocument from={params.from} sales={params.sales} to={params.to} />,
  )
}
