import { ScaffoldActionButton } from '@/components/scaffold-action-button'
import { TierLockBanner } from '@/components/tier-lock-banner'
import {
  createCategoryScaffoldAction,
  createProductScaffoldAction,
} from '@/app/(dashboard)/actions'
import {
  getBusinessEntitlements,
  getCategoryManagementRows,
  getProductManagementRows,
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

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-PH')
}

export default async function ProductsPage() {
  const [entitlementsResult, result, categoriesResult] = await Promise.all([
    getBusinessEntitlements(),
    getProductManagementRows(),
    getCategoryManagementRows(),
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
