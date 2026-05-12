// Phase W0.5 + W0.7 — Read-Only Dashboard.
//
// Server Component that runs RLS-protected queries against the same Supabase
// schema mobile writes to. Accepts ?date=YYYY-MM-DD and ?range=today|week|month.
// Renders an inline SVG hourly-gross histogram alongside the KPI tiles.
// Sections grouped under labelled headers for visual organisation.

import Link from 'next/link'

import {
  getLowStockProducts,
  getPerBranchBreakdown,
  getPerCashierBreakdown,
  getRecentSales,
  getSalesSummaryForRange,
  getTopProductsBreakdown,
} from '@/lib/queries/dashboard'
import { getBusinessEntitlements } from '@/lib/queries/management'
import { formatMoney } from '@tdpos/shared'

// Small uppercase eyebrow used to group sibling cards under a labelled
// section. Pulls visual hierarchy through the dense dashboard without
// adding row breaks or full chrome between groups.
function SectionGroupHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="flex items-baseline justify-between gap-3">
      <div className="flex flex-col">
        {eyebrow ? (
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="m-0 text-base font-semibold text-ink-900">{title}</h2>
      </div>
    </header>
  )
}

type DashboardRange = 'today' | 'week' | 'month'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  qr_ph: 'QR Ph',
  maya: 'Maya',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Today',
  week: 'Week',
  month: 'Month',
}

function formatPaymentMethod(method: string, isUtang: boolean): string {
  const base = PAYMENT_LABELS[method] ?? method
  return isUtang ? `${base} · Utang` : base
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function parseDateParam(raw: string | string[] | undefined): Date {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !ISO_DATE.test(value)) return new Date()
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return new Date()
  const parsed = new Date(y, m - 1, d)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function parseRangeParam(raw: string | string[] | undefined): DashboardRange {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'week' || value === 'month' ? value : 'today'
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function getDashboardDateRange(anchorDate: Date, range: DashboardRange): { from: Date; to: Date } {
  if (range === 'month') {
    return {
      from: new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0),
      to: new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }

  if (range === 'week') {
    const mondayOffset = (anchorDate.getDay() + 6) % 7
    const monday = new Date(anchorDate)
    monday.setDate(anchorDate.getDate() - mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      from: startOfLocalDay(monday),
      to: endOfLocalDay(sunday),
    }
  }

  return {
    from: startOfLocalDay(anchorDate),
    to: endOfLocalDay(anchorDate),
  }
}

function formatRangeLabel(range: DashboardRange, from: Date, to: Date): string {
  if (range === 'month') {
    return from.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  }

  if (range === 'week') {
    return `${from.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    })} to ${to.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  return from.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
}

function periodCopy(range: DashboardRange): string {
  if (range === 'week') return 'this week'
  if (range === 'month') return 'this month'
  return 'today'
}

interface HourlyHistogramProps {
  buckets: number[]
  peak: number
}

function HourlyHistogram({ buckets, peak }: HourlyHistogramProps) {
  const width = 480
  const height = 96
  const barWidth = width / 24
  const peakHour = peak > 0 ? buckets.findIndex((b) => b === peak) : -1

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Hourly gross sales pattern for the selected reporting window"
      className="h-24 w-full"
    >
      <line
        x1={0}
        x2={width}
        y1={height - 1}
        y2={height - 1}
        className="stroke-ink-200"
        strokeWidth={1}
      />
      {buckets.map((value, hour) => {
        const ratio = peak > 0 ? value / peak : 0
        const barHeight = ratio * (height - 6)
        const x = hour * barWidth + 1
        const y = height - 1 - barHeight
        const isPeak = hour === peakHour && peak > 0
        return (
          <rect
            key={hour}
            x={x}
            y={y}
            width={barWidth - 2}
            height={Math.max(0, barHeight)}
            rx={2}
            className={isPeak ? 'fill-amber-500' : 'fill-teal-500'}
          />
        )
      })}
    </svg>
  )
}

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; range?: string | string[] }>
}) {
  const params = await searchParams
  const forDate = parseDateParam(params.date)
  const selectedRange = parseRangeParam(params.range)
  const dateRange = getDashboardDateRange(forDate, selectedRange)
  const dateLabel = formatRangeLabel(selectedRange, dateRange.from, dateRange.to)
  const period = periodCopy(selectedRange)
  const dateIso = isoDate(forDate)
  const fromIso = isoDate(dateRange.from)
  const toIso = isoDate(dateRange.to)
  const exportHref = `/api/exports/sales?from=${fromIso}&to=${toIso}`
  const exportPdfHref = `/api/exports/sales/pdf?from=${fromIso}&to=${toIso}`

  const [
    entitlementsResult,
    salesSummary,
    lowStock,
    recentSales,
    perBranch,
    perCashier,
    topProducts,
  ] = await Promise.all([
    getBusinessEntitlements(),
    getSalesSummaryForRange(dateRange),
    getLowStockProducts(),
    getRecentSales(),
    getPerBranchBreakdown(dateRange),
    getPerCashierBreakdown(dateRange),
    getTopProductsBreakdown(dateRange),
  ])
  const canExport =
    entitlementsResult.ready && entitlementsResult.entitlements.isSurfaceEnabled('web.exports')

  const envUnconfigured = !salesSummary.ready && salesSummary.reason === 'supabase_unconfigured'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Overview</h1>
          <p className="mt-1 text-sm text-ink-600">
            {dateLabel} · live read-only view of sales, low-stock items, and recent receipts.
          </p>
        </div>
        <form action="/dashboard" method="get" className="flex flex-wrap items-center gap-2">
          <label htmlFor="dashboard-date" className="text-[12px] font-semibold text-ink-600">
            Date
          </label>
          <input
            id="dashboard-date"
            name="date"
            type="date"
            defaultValue={dateIso}
            className="rounded-lg border border-ink-300 bg-white px-2 py-1.5 text-[13px] text-ink-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <div
            aria-label="Reporting range"
            className="inline-flex overflow-hidden rounded-lg border border-ink-300 bg-white"
            role="radiogroup"
          >
            {(['today', 'week', 'month'] as const).map((range) => (
              <label key={range} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  defaultChecked={selectedRange === range}
                  name="range"
                  type="radio"
                  value={range}
                />
                <span className="block px-3 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors peer-checked:bg-teal-700 peer-checked:text-white">
                  {RANGE_LABELS[range]}
                </span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            View
          </button>
          {canExport ? (
            <>
              <a
                href={exportHref}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-white px-3 py-1.5 text-[13px] font-semibold text-teal-700 shadow-sm transition-colors hover:bg-teal-50"
              >
                <span aria-hidden>↓</span>
                Export CSV
              </a>
              <a
                href={exportPdfHref}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-white px-3 py-1.5 text-[13px] font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-50"
              >
                <span aria-hidden>↓</span>
                Export PDF
              </a>
            </>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] font-semibold text-amber-700 no-underline transition-colors hover:bg-amber-100"
              title="Compare tiers to unlock CSV + PDF exports"
            >
              <span aria-hidden>🔒</span>
              Exports unlock at Plus
            </Link>
          )}
        </form>
      </header>

      {envUnconfigured ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700"
        >
          Supabase environment is not configured. Set
          <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[12px] text-amber-700">
            NEXT_PUBLIC_SUPABASE_URL
          </code>
          and
          <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[12px] text-amber-700">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          </code>
          to load real data.
        </div>
      ) : null}

      <SectionGroupHeader eyebrow="Today's snapshot" title="Headline numbers" />

      {/* KPI tiles */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
            Gross {period}
          </p>
          {salesSummary.ready ? (
            <>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-teal-700">
                {salesSummary.formattedGross}
              </p>
              <p className="mt-1 text-[13px] text-ink-500">
                {salesSummary.saleCount} {salesSummary.saleCount === 1 ? 'sale' : 'sales'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-500">
              {salesSummary.ready === false && salesSummary.reason === 'query_failed'
                ? `Couldn’t load: ${salesSummary.message ?? 'unknown error'}`
                : '—'}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm sm:col-span-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[1px] text-ink-500">
            Payment mix
          </p>
          {salesSummary.ready && salesSummary.paymentMix.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {salesSummary.paymentMix.map((row) => {
                const pct =
                  salesSummary.gross > 0 ? Math.round((row.gross / salesSummary.gross) * 100) : 0
                return (
                  <li
                    key={`${row.paymentMethod}-${row.isUtang}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex-1 text-sm text-ink-700">
                      {formatPaymentMethod(row.paymentMethod, row.isUtang)}
                    </span>
                    <span className="w-32 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className="block h-1.5 bg-teal-600"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </span>
                    <span className="w-14 text-right text-[13px] tabular-nums text-ink-600">
                      {pct}%
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">No sales yet for {period}.</p>
          )}
        </article>
      </section>

      {/* Hourly histogram */}
      <section>
        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Hourly gross pattern</h2>
            {salesSummary.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                Peak {formatMoney(salesSummary.hourlyPeak)}
              </span>
            ) : null}
          </header>
          {salesSummary.ready ? (
            salesSummary.gross > 0 ? (
              <div className="mt-3">
                <HourlyHistogram
                  buckets={salesSummary.hourlyGross}
                  peak={salesSummary.hourlyPeak}
                />
                <div className="mt-2 flex justify-between text-[11px] tabular-nums text-ink-500">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">No sales recorded for {dateLabel}.</p>
            )
          ) : (
            <p className="mt-2 text-sm text-ink-500">—</p>
          )}
        </article>
      </section>

      <SectionGroupHeader eyebrow="Breakdowns" title="Where the sales came from" />

      {/* Per-branch + per-cashier breakdown */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Branches</h2>
            {perBranch.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {perBranch.rows.length} {perBranch.rows.length === 1 ? 'branch' : 'branches'} active
              </span>
            ) : null}
          </header>
          {!perBranch.ready ? (
            <p className="mt-2 text-sm text-ink-500">
              {perBranch.reason === 'query_failed'
                ? `Couldn’t load: ${perBranch.message ?? 'unknown error'}`
                : 'Configure Supabase to see per-branch totals.'}
            </p>
          ) : perBranch.rows.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No branch sales recorded for {dateLabel}.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-ink-100">
              {perBranch.rows.map((row) => (
                <li
                  key={row.branchId}
                  className="flex items-center justify-between gap-3 py-2 text-[13px]"
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-semibold text-ink-800">{row.branchName}</span>
                    <span className="text-[12px] text-ink-500">
                      {row.region ? `${row.region} · ` : ''}
                      {row.saleCount} {row.saleCount === 1 ? 'sale' : 'sales'}
                    </span>
                  </div>
                  <span className="hidden w-24 overflow-hidden rounded-full bg-ink-100 sm:block">
                    <span
                      className="block h-1.5 bg-teal-600"
                      style={{ width: `${row.pct}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-24 text-right tabular-nums text-ink-900">
                    {row.formattedGross}
                  </span>
                  <span className="w-12 text-right text-[12px] tabular-nums text-ink-500">
                    {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Cashiers</h2>
            {perCashier.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {perCashier.rows.length} active · phone last 4 only
              </span>
            ) : null}
          </header>
          {!perCashier.ready ? (
            <p className="mt-2 text-sm text-ink-500">
              {perCashier.reason === 'query_failed'
                ? `Couldn’t load: ${perCashier.message ?? 'unknown error'}`
                : 'Configure Supabase to see per-cashier totals.'}
            </p>
          ) : perCashier.rows.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No cashier sales recorded for {dateLabel}.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-ink-100">
              {perCashier.rows.map((row, idx) => (
                <li
                  key={row.userId ?? `unassigned-${idx}`}
                  className="flex items-center justify-between gap-3 py-2 text-[13px]"
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-mono text-ink-800">{row.phoneSuffix}</span>
                    <span className="text-[12px] text-ink-500">
                      {row.role} · {row.saleCount} {row.saleCount === 1 ? 'sale' : 'sales'}
                    </span>
                  </div>
                  <span className="hidden w-24 overflow-hidden rounded-full bg-ink-100 sm:block">
                    <span
                      className="block h-1.5 bg-amber-500"
                      style={{ width: `${row.pct}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-24 text-right tabular-nums text-ink-900">
                    {row.formattedGross}
                  </span>
                  <span className="w-12 text-right text-[12px] tabular-nums text-ink-500">
                    {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* Top-selling products */}
      <section>
        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Top sellers</h2>
            {topProducts.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                Top {topProducts.rows.length} by gross
              </span>
            ) : null}
          </header>
          {!topProducts.ready ? (
            <p className="mt-2 text-sm text-ink-500">
              {topProducts.reason === 'query_failed'
                ? `Couldn’t load: ${topProducts.message ?? 'unknown error'}`
                : 'Configure Supabase to see top products.'}
            </p>
          ) : topProducts.rows.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No items sold for {dateLabel}.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-ink-100">
              {topProducts.rows.map((row) => (
                <li
                  key={row.productId}
                  className="flex items-center justify-between gap-3 py-2 text-[13px]"
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-semibold text-ink-800">{row.name}</span>
                    <span className="text-[12px] text-ink-500 tabular-nums">
                      {row.piecesSold} {row.unitLabel ?? 'piece'}
                      {row.piecesSold === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="hidden w-32 overflow-hidden rounded-full bg-ink-100 sm:block">
                    <span
                      className="block h-1.5 bg-teal-500"
                      style={{ width: `${row.pct}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-24 text-right tabular-nums text-ink-900">
                    {row.formattedGross}
                  </span>
                  <span className="w-12 text-right text-[12px] tabular-nums text-ink-500">
                    {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <SectionGroupHeader eyebrow="Watch list" title="What needs attention" />

      {/* Low stock + recent sales */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Low stock</h2>
            {lowStock.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {lowStock.products.length} items
              </span>
            ) : null}
          </header>
          {lowStock.ready ? (
            lowStock.products.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                All products are above their reorder point.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                {lowStock.products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex-1 truncate text-sm text-ink-800">{p.name}</span>
                    <span className="text-[13px] tabular-nums text-danger-600">{p.display}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="mt-2 text-sm text-ink-500">
              {lowStock.reason === 'query_failed'
                ? `Couldn’t load: ${lowStock.message ?? 'unknown error'}`
                : 'Configure Supabase to see low-stock items.'}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <header className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-semibold text-teal-700">Recent receipts</h2>
            {recentSales.ready ? (
              <span className="text-[11px] uppercase tracking-[1px] text-ink-400">
                {recentSales.sales.length} latest
              </span>
            ) : null}
          </header>
          {recentSales.ready ? (
            recentSales.sales.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                No receipts yet. Make a sale on the cashier app.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                {recentSales.sales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-3 py-2 text-[13px]"
                  >
                    <div className="flex flex-1 flex-col">
                      <span className="font-mono text-ink-700">{sale.receiptNumber}</span>
                      <span className="text-[12px] text-ink-500">
                        {formatTime(sale.createdAt)} ·{' '}
                        {formatPaymentMethod(sale.paymentMethod, sale.isUtang)}
                      </span>
                    </div>
                    <span className="text-base tabular-nums text-ink-900">
                      {sale.formattedTotal}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="mt-2 text-sm text-ink-500">
              {recentSales.reason === 'query_failed'
                ? `Couldn’t load: ${recentSales.message ?? 'unknown error'}`
                : 'Configure Supabase to see recent receipts.'}
            </p>
          )}
        </article>
      </section>
    </div>
  )
}
