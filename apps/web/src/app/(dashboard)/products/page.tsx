import { TierLockBanner } from '@/components/tier-lock-banner'
import { getBusinessEntitlements, getProductManagementRows } from '@/lib/queries/management'

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

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

export default async function ProductsPage() {
  const [entitlementsResult, result] = await Promise.all([
    getBusinessEntitlements(),
    getProductManagementRows(),
  ])
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const canManage = entitlements?.isSurfaceEnabled('web.products') ?? false

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink-900">Products</h1>
          <p className="mt-1 text-sm text-ink-600">Catalog, stock, tingi units, and prices.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-400"
        >
          Add product
        </button>
      </header>

      {!canManage && entitlements ? (
        <TierLockBanner
          tierLabel={entitlements.tierShortLabel}
          surfaceLabel="Products management"
          unlockedAt="Pro"
        />
      ) : null}

      {!result.ready ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {result.reason === 'supabase_unconfigured'
            ? 'Supabase is not configured.'
            : `Products could not load: ${result.message ?? 'unknown error'}`}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-teal-700">{result.activeCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Hidden</p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">{result.inactiveCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">Low stock</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{result.lowStockCount}</p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="m-0 text-[11px] font-semibold uppercase text-ink-500">
                {entitlements?.tierShortLabel ?? 'Tier'} limit
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink-700">
                {formatLimit(entitlements?.maxProducts ?? null)}
              </p>
            </div>
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
                    <td className="px-4 py-6 text-center text-ink-500" colSpan={5}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  result.products.map((product) => (
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
                        {product.stockDisplay}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
