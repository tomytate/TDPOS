// Phase W0.7 — Sales CSV export Route Handler.
//
// GET /api/exports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
//   → text/csv with Content-Disposition: attachment.
//
// Defaults to today's local date when params are missing. Defense-in-depth:
// proxy.ts already redirects unauthenticated requests, but this handler still
// re-checks claims so a misrouted call returns 401, not data.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { buildSalesCsv, buildSalesCsvFilename } from '@/lib/csv/build-sales-csv'
import { getSalesForExport } from '@/lib/queries/sales-export'
import { getCurrentClaims } from '@/lib/supabase/server'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function parseDateParam(value: string | null, fallback: Date): Date | null {
  if (!value) return fallback
  if (!ISO_DATE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const d = new Date(year, month - 1, day)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export async function GET(request: NextRequest) {
  // Defense-in-depth claim check.
  let claims: Awaited<ReturnType<typeof getCurrentClaims>>
  try {
    claims = await getCurrentClaims()
  } catch {
    return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  }
  if (!claims) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const today = new Date()
  const fromRaw = request.nextUrl.searchParams.get('from')
  const toRaw = request.nextUrl.searchParams.get('to')

  const fromDay = parseDateParam(fromRaw, today)
  const toDay = parseDateParam(toRaw, today)

  if (!fromDay || !toDay) {
    return NextResponse.json(
      { error: 'invalid_date', detail: 'Use ?from=YYYY-MM-DD&to=YYYY-MM-DD.' },
      { status: 400 },
    )
  }

  const from = startOfLocalDay(fromDay)
  const to = endOfLocalDay(toDay)

  if (from.getTime() > to.getTime()) {
    return NextResponse.json(
      { error: 'invalid_range', detail: '`from` is after `to`.' },
      { status: 400 },
    )
  }

  const result = await getSalesForExport({ from, to })
  if (!result.ready) {
    const status = result.reason === 'supabase_unconfigured' ? 503 : 502
    return NextResponse.json({ error: result.reason, message: result.message }, { status })
  }

  const csv = buildSalesCsv(result.sales)
  const filename = buildSalesCsvFilename(from, to)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
