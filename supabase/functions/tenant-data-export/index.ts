// TD POS - tenant-data-export Edge Function
//
// Produces a single JSON export for the signed-in owner's business. The
// function requires a client_operation_id because the export is audited via
// `record_tenant_export`, and that audit side effect must be idempotent.
//
// Runtime: Deno (Supabase Edge Functions).
// Auth:    'user' - authenticated owner only. The RPC verifies owner role.
// Output:  JSON document with tenant-scoped tables and generated metadata.

// @ts-ignore: npm specifier is Deno/Supabase-only
import { withSupabase } from 'npm:@supabase/server'
// @ts-ignore: workspace import resolved by the Supabase Deno bundler
import { tenantDataExportRequestSchema } from '../../../packages/shared/src/validators/index.ts'

interface RpcResult<T> {
  data: T | null
  error: { message: string } | null
}

interface QueryResult {
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}

interface QueryBuilder {
  select: (columns: string) => QueryFilter
}

interface QueryFilter extends Promise<QueryResult> {
  eq: (column: string, value: unknown) => QueryFilter
  in: (column: string, values: unknown[]) => QueryFilter
  order: (column: string, options?: { ascending?: boolean }) => QueryFilter
}

interface SupabaseClientLike {
  rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>
  from: (table: string) => QueryBuilder
}

interface SupabaseContext {
  supabase: SupabaseClientLike
  supabaseAdmin: SupabaseClientLike
  userClaims: { sub: string } | null
  jwtClaims: Record<string, unknown> | null
  authMode: 'user' | 'none' | 'secret' | 'publishable'
}

interface ExportAuditResult {
  ok: boolean
  reason?: string
  business_id?: string
  user_id?: string
  replayed?: boolean
}

type ExportTable =
  | 'businesses'
  | 'users'
  | 'branches'
  | 'categories'
  | 'products'
  | 'customers'
  | 'sales'
  | 'sale_items'
  | 'receipts'
  | 'payments'
  | 'eopt_invoice_documents'
  | 'utang_payments'
  | 'inventory_logs'
  | 'audit_logs'
  | 'applied_operations'
  | 'pending_invites'
  | 'business_devices'
  | 'shift_sessions'
  | 'manager_approval_requests'
  | 'weighted_plu_profiles'
  | 'kiosk_orders'
  | 'return_requests'

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function selectByBusiness(
  client: SupabaseClientLike,
  table: ExportTable,
  businessId: string,
) {
  const { data, error } = await client.from(table).select('*').eq('business_id', businessId)
  if (error) throw new Error(`${table}:${error.message}`)
  return data ?? []
}

async function selectByIds(
  client: SupabaseClientLike,
  table: ExportTable,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) return []
  const { data, error } = await client.from(table).select('*').in(column, ids)
  if (error) throw new Error(`${table}:${error.message}`)
  return data ?? []
}

function pluckIds(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => row.id).filter((id): id is string => typeof id === 'string')
}

function statusForReason(reason: string | undefined) {
  if (reason === 'forbidden') return 403
  if (reason === 'unauthenticated' || reason === 'account_not_provisioned') return 401
  return 400
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx: SupabaseContext) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 })
    }

    const parsed = tenantDataExportRequestSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { data: auditResult, error: auditError } = await ctx.supabase.rpc<ExportAuditResult>(
      'record_tenant_export',
      { p_client_operation_id: parsed.data.client_operation_id },
    )

    if (auditError) {
      return Response.json({ error: auditError.message }, { status: 400 })
    }

    if (!auditResult?.ok || !auditResult.business_id) {
      return Response.json(
        { error: auditResult?.reason ?? 'export_not_allowed' },
        { status: statusForReason(auditResult?.reason) },
      )
    }

    const businessId = auditResult.business_id
    const admin = ctx.supabaseAdmin

    try {
      const [
        businesses,
        users,
        branches,
        categories,
        products,
        customers,
        sales,
        auditLogs,
        appliedOperations,
        pendingInvites,
        businessDevices,
        shiftSessions,
        managerApprovalRequests,
        weightedPluProfiles,
        kioskOrders,
        returnRequests,
      ] = await Promise.all([
        selectByBusiness(admin, 'businesses', businessId),
        selectByBusiness(admin, 'users', businessId),
        selectByBusiness(admin, 'branches', businessId),
        selectByBusiness(admin, 'categories', businessId),
        selectByBusiness(admin, 'products', businessId),
        selectByBusiness(admin, 'customers', businessId),
        selectByBusiness(admin, 'sales', businessId),
        selectByBusiness(admin, 'audit_logs', businessId),
        selectByBusiness(admin, 'applied_operations', businessId),
        selectByBusiness(admin, 'pending_invites', businessId),
        selectByBusiness(admin, 'business_devices', businessId),
        selectByBusiness(admin, 'shift_sessions', businessId),
        selectByBusiness(admin, 'manager_approval_requests', businessId),
        selectByBusiness(admin, 'weighted_plu_profiles', businessId),
        selectByBusiness(admin, 'kiosk_orders', businessId),
        selectByBusiness(admin, 'return_requests', businessId),
      ])

      const saleIds = pluckIds(sales)
      const customerIds = pluckIds(customers)
      const branchIds = pluckIds(branches)

      const [saleItems, receipts, payments, eoptInvoiceDocuments, utangPayments, inventoryLogs] =
        await Promise.all([
          selectByIds(admin, 'sale_items', 'sale_id', saleIds),
          selectByIds(admin, 'receipts', 'sale_id', saleIds),
          selectByIds(admin, 'payments', 'sale_id', saleIds),
          selectByIds(admin, 'eopt_invoice_documents', 'sale_id', saleIds),
          selectByIds(admin, 'utang_payments', 'customer_id', customerIds),
          selectByIds(admin, 'inventory_logs', 'branch_id', branchIds),
        ])

      return Response.json({
        ok: true,
        export_version: 1,
        generated_at: new Date().toISOString(),
        client_operation_id: parsed.data.client_operation_id,
        business_id: businessId,
        replayed: auditResult.replayed ?? false,
        data: {
          businesses,
          users,
          branches,
          categories,
          products,
          customers,
          sales,
          sale_items: saleItems,
          receipts,
          payments,
          eopt_invoice_documents: eoptInvoiceDocuments,
          utang_payments: utangPayments,
          inventory_logs: inventoryLogs,
          audit_logs: auditLogs,
          applied_operations: appliedOperations,
          pending_invites: pendingInvites,
          business_devices: businessDevices,
          shift_sessions: shiftSessions,
          manager_approval_requests: managerApprovalRequests,
          weighted_plu_profiles: weightedPluProfiles,
          kiosk_orders: kioskOrders,
          return_requests: returnRequests,
        },
      })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'export_failed' },
        { status: 400 },
      )
    }
  }),
}
