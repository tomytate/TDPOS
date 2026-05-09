// Phase W0.7 — Sales PDF export Route Handler.
//
// GET /api/exports/sales/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
//   → application/pdf with Content-Disposition: attachment.
//
// Mirrors the CSV export query and keeps the same defense-in-depth claim check.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { buildSalesPdfBuffer, buildSalesPdfFilename } from '@/lib/pdf/build-sales-pdf'
import { getSalesForExport } from '@/lib/queries/sales-export'
import { getCurrentClaims } from '@/lib/supabase/server'

export const runtime = 'nodejs'

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

  const pdf = await buildSalesPdfBuffer({ from, sales: result.sales, to })
  const filename = buildSalesPdfFilename(from, to)

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
