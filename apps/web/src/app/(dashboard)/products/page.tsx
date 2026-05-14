// Web product catalog. Polished for v0.9 visual QA: tier-aware limit
// usage progress bar that turns amber at >=80% and danger at >=95%,
// per-row stock-status pill (out / low / ok), tone-aware metric tiles,
// and a softer empty state. Real mutations still flow through the
// existing Server Action; this is presentation polish only.

import { ErrorStateCard } from '@/components/error-state-card'
import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { TierLockBanner } from '@/components/tier-lock-banner'
import {
  createCategoryScaffoldAction,
  createProductScaffoldAction,
  importProductsCsvScaffoldAction,
} from '@/app/(dashboard)/actions'
import {
  getBusinessEntitlements,
  getCategoryManagementRows,
  getProductManagementRows,
  type ProductManagementRow,
} from '@/lib/queries/management'

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'rounded-full bg-success-500/10 px-2 py-0.5 text-[12px] font-semibold text-success-600'
          : 'rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-500'
      }
    >
      {active ? 'Active' : 'Hidden'}
    </span>
  )
}

type StockTone = 'out' | 'low' | 'ok'

function stockTone(product: ProductManagementRow): StockTone {
  if (product.stockPieces <= 0) return 'out'
  if (product.reorderPointPieces !== null && product.stockPieces <= product.reorderPointPieces) {
    return 'low'
  }
  return 'ok'
}

function StockBadge({ tone }: { tone: StockTone }) {
  const styles: Record<StockTone, string> = {
    out: 'bg-danger-500/10 text-danger-600',
    low: 'bg-amber-500/10 text-amber-700',
    ok: 'bg-success-500/10 text-success-600',
  }
  const label: Record<StockTone, string> = { out: 'Out', low: 'Low', ok: 'OK' }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${styles[tone]}`}
    >
      {label[tone]}
    </span>
  )
}

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'good' | 'warn'
}) {
  const color =
    tone === 'good' ? 'text-teal-700' : tone === 'warn' ? 'text-amber-700' : 'text-ink-800'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function LimitUsageBar({
  used,
  limit,
  tierLabel,
}: {
  used: number
  limit: number | null
  tierLabel: string
}) {
  if (limit === null) {
    return (
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
        <p className="mt-2 text-2xl font-semibold text-ink-800">Unlimited</p>
        <p className="mt-1 text-[12px] text-ink-500">No cap at this tier.</p>
      </div>
    )
  }
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100)
  const tone = pct >= 95 ? 'bg-danger-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal-600'
  const valueColor = pct >= 95 ? 'text-danger-600' : pct >= 80 ? 'text-amber-700' : 'text-teal-700'
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">{tierLabel} limit</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {used.toLocaleString('en-PH')}
        <span className="text-base font-normal text-ink-500"> / {formatLimit(limit)}</span>
      </p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${used} of ${limit} products used`}
      >
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function ProductsPage() {
  const [entitlementsResult, result, categoriesResult] = await Promise.all([
    getBusinessEntitlements(),
    getProductManagementRows(),
    getCategoryManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.products') ?? false
  const totalCount = result.ready ? result.activeCount + result.inactiveCount : 0

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Products</h1>
          <p className="mt-1 text-sm text-ink-600">Catalog, stock, tingi units, and prices.</p>
        </div>
        <ScaffoldActionButton
          action={createProductScaffoldAction}
          label="Validate product scaffold"
          fields={[
            {
              kind: 'text',
              name: 'name',
              label: 'Name',
              placeholder: 'Test Sachet',
              required: true,
            },
            { kind: 'text', name: 'sku', label: 'SKU', placeholder: 'SACHET-001' },
            { kind: 'number', name: 'price_per_piece', label: 'Piece price', defaultValue: '7' },
            { kind: 'number', name: 'stock_pieces', label: 'Stock pieces', defaultValue: '0' },
            { kind: 'number', name: 'pieces_per_pack', label: 'Pieces / pack', defaultValue: '1' },
            { kind: 'text', name: 'unit_label', label: 'Unit label', defaultValue: 'pc' },
            { kind: 'checkbox', name: 'is_tingi', label: 'Tingi enabled' },
          ]}
        />
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Products management"
          unlockedAt="Pro"
        />
      ) : null}

      <section className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <div className="mb-3">
          <h2 className="m-0 text-base font-semibold text-ink-900">Category scaffold</h2>
          <p className="mt-1 text-sm text-ink-600">
            Category creation shares the Products tier guard. Real inserts and audit rows land in
            the W0.8 mutation pass.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <ScaffoldActionButton
            action={createCategoryScaffoldAction}
            label="Validate category scaffold"
            fields={[
              {
                kind: 'text',
                name: 'name',
                label: 'Name',
                placeholder: 'Sachets',
                required: true,
              },
              { kind: 'text', name: 'color', label: 'Color', defaultValue: '#0f766e' },
            ]}
          />
          <div className="rounded-lg border border-ink-200 bg-white p-3">
            <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
              Existing categories
            </p>
            {!categoriesResult.ready ? (
              <p className="mt-2 text-sm text-amber-700">
                {categoriesResult.reason === 'supabase_unconfigured'
                  ? 'Supabase is not configured.'
                  : `Categories could not load: ${categoriesResult.message ?? 'unknown error'}`}
              </p>
            ) : categoriesResult.categories.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No categories found.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {categoriesResult.categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: category.color ?? '#0f766e' }}
                    />
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <div className="mb-3">
          <h2 className="m-0 text-base font-semibold text-ink-900">Bulk catalog import</h2>
          <p className="mt-1 text-sm text-ink-600">
            Paste a CSV with headers: <code>name,sku,price_per_piece,stock_pieces</code>. Optional
            headers: <code>pieces_per_pack,unit_label,price_per_pack,is_tingi</code>.
          </p>
        </div>
        <ScaffoldActionButton
          action={importProductsCsvScaffoldAction}
          label="Import CSV products"
          fields={[
            {
              kind: 'textarea',
              name: 'catalog_csv',
              label: 'Catalog CSV',
              required: true,
              rows: 7,
              placeholder:
                'name,sku,price_per_piece,stock_pieces,pieces_per_pack,unit_label,is_tingi\nTest Sachet,SACHET-001,7,120,12,sachet,true',
            },
          ]}
        />
      </section>

      {!result.ready ? (
        <ErrorStateCard
          title={
            result.reason === 'supabase_unconfigured'
              ? 'Supabase is not configured'
              : 'Products could not load'
          }
          body={
            result.reason === 'supabase_unconfigured'
              ? 'Set the Supabase env vars in apps/web/.env.local to connect this dashboard.'
              : (result.message ?? 'An unknown error occurred while loading products.')
          }
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <MetricTile label="Active" value={result.activeCount} tone="good" />
            <MetricTile label="Hidden" value={result.inactiveCount} />
            <MetricTile
              label="Low stock"
              value={result.lowStockCount}
              tone={result.lowStockCount > 0 ? 'warn' : 'neutral'}
            />
            <LimitUsageBar
              used={totalCount}
              limit={entitlements?.maxProducts ?? null}
              tierLabel={entitlements?.tierShortLabel ?? 'Tier'}
            />
          </section>

          <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-ink-50 text-[12px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={5}>
                      <p className="m-0 text-base font-semibold text-ink-800">No products yet</p>
                      <p className="mt-1 text-sm text-ink-500">
                        Use “Validate product scaffold” above to add a row, or sync from your
                        existing catalog.
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.products.map((product) => {
                    const tone = stockTone(product)
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink-900">{product.name}</div>
                          <div className="mt-0.5 text-[12px] text-ink-500">
                            {product.sku ?? 'No SKU'} {product.isTingi ? '· Tingi' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {product.categoryName ?? 'Uncategorized'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-700">
                          <div className="flex items-center gap-2">
                            <span>{product.stockDisplay}</span>
                            <StockBadge tone={tone} />
                          </div>
                          {product.reorderPointPieces !== null ? (
                            <div className="mt-0.5 text-[11px] text-ink-500">
                              Reorder at {product.reorderPointPieces.toLocaleString('en-PH')}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-700">
                          <div>{product.formattedPricePerPiece}</div>
                          {product.formattedPricePerPack ? (
                            <div className="text-[12px] text-ink-500">
                              Pack {product.formattedPricePerPack}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge active={product.isActive} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
