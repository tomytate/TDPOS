// TD POS — eod-report Edge Function
//
// End-of-day report scaffold for manager-triggered previews and future
// Supabase Cron delivery. User mode is tenant-scoped through RLS; secret mode
// requires an explicit business_id for scheduled jobs.
//
// Runtime: Deno (Supabase Edge Functions).
// Auth:    ['user', 'secret'] — authenticated owner/manager preview or cron.
// Source:  https://supabase.com/blog/introducing-supabase-server (public beta, 2026-05-06)

// @ts-ignore: npm specifier is Deno/Supabase-only
import { withSupabase } from 'npm:@supabase/server'

interface RpcResult<T> {
  data: T | null
  error: { message: string } | null
}

interface QueryResult<T> {
  data: T[] | null
  error: { message: string } | null
}

interface SupabaseClientLike {
  rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: unknown,
      ) => {
        gte: (
          column: string,
          value: string,
        ) => {
          lt: (column: string, value: string) => Promise<QueryResult<SaleRow>>
        }
      }
    }
  }
}

interface SupabaseContext {
  supabase: SupabaseClientLike
  supabaseAdmin: SupabaseClientLike
  userClaims: { sub: string } | null
  jwtClaims: Record<string, unknown> | null
  authMode: 'user' | 'none' | 'secret' | 'publishable'
}

interface EodReportRequest {
  business_id?: unknown
  date?: unknown
}

interface SaleRow {
  id: string
  total_amount: number | string
  payment_method: string
  is_utang: boolean
  status: string
  created_at: string
}

const MANILA_TIME_ZONE = 'Asia/Manila'
const DAY_MS = 24 * 60 * 60 * 1000

function manilaDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function parseDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return manilaDateString()
  if (typeof value !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function manilaDayBounds(date: string): { startIso: string; endIso: string } {
  const start = new Date(`${date}T00:00:00+08:00`)
  const end = new Date(start.getTime() + DAY_MS)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

async function readJson(req: Request): Promise<EodReportRequest> {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    return {
      business_id: url.searchParams.get('business_id') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
    }
  }

  try {
    return (await req.json()) as EodReportRequest
  } catch {
    return {}
  }
}

async function resolveBusinessId(
  body: EodReportRequest,
  ctx: SupabaseContext,
): Promise<{ businessId: string; client: SupabaseClientLike } | Response> {
  if (ctx.authMode === 'secret') {
    if (typeof body.business_id !== 'string' || body.business_id.length === 0) {
      return Response.json({ error: 'business_id_required' }, { status: 400 })
    }

    return { businessId: body.business_id, client: ctx.supabaseAdmin }
  }

  const { data, error } = await ctx.supabase.rpc<string>('current_business_id')
  if (error || !data) {
    return Response.json({ error: error?.message ?? 'business_not_found' }, { status: 403 })
  }

  return { businessId: data, client: ctx.supabase }
}

function summarizeSales(rows: SaleRow[]) {
  const paymentMix = new Map<string, { count: number; total: number }>()
  let grossSales = 0
  let completedSales = 0
  let utangSales = 0

  for (const row of rows) {
    if (row.status !== 'completed') continue

    const total = Number(row.total_amount) || 0
    grossSales += total
    completedSales += 1
    if (row.is_utang) utangSales += total

    const current = paymentMix.get(row.payment_method) ?? { count: 0, total: 0 }
    current.count += 1
    current.total += total
    paymentMix.set(row.payment_method, current)
  }

  return {
    sales_count: completedSales,
    gross_sales: grossSales,
    utang_sales: utangSales,
    average_ticket: completedSales === 0 ? 0 : grossSales / completedSales,
    payment_mix: Array.from(paymentMix.entries()).map(([method, value]) => ({
      method,
      count: value.count,
      total: value.total,
    })),
  }
}

export default {
  fetch: withSupabase({ auth: ['user', 'secret'] }, async (req: Request, ctx: SupabaseContext) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 })
    }

    const body = await readJson(req)
    const date = parseDate(body.date)
    if (!date) return Response.json({ error: 'invalid_date' }, { status: 400 })

    const resolved = await resolveBusinessId(body, ctx)
    if (resolved instanceof Response) return resolved

    const { startIso, endIso } = manilaDayBounds(date)
    const { data, error } = await resolved.client
      .from('sales')
      .select('id, total_amount, payment_method, is_utang, status, created_at')
      .eq('business_id', resolved.businessId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    const summary = summarizeSales(data ?? [])
    return Response.json({
      ok: true,
      business_id: resolved.businessId,
      date,
      time_zone: MANILA_TIME_ZONE,
      window: { start: startIso, end: endIso },
      ...summary,
      delivery: {
        sms_enabled: false,
        reason: 'sms_provider_not_configured',
      },
    })
  }),
}
