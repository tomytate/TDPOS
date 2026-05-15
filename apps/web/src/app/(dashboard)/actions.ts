'use server'

import { createHash, randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  DEFAULT_MODULE_STATE,
  SURFACE_LABELS,
  branchManagementDraftSchema,
  categoryManagementDraftSchema,
  customerErasureDraftSchema,
  deviceLostReplacementDraftSchema,
  deviceManagementDraftSchema,
  devicePairingCodeDraftSchema,
  normalizeDevicePairingCode,
  moduleManagementDraftSchema,
  productBulkImportDraftSchema,
  pendingInviteRevokeDraftSchema,
  normalizePhPhone,
  productManagementDraftSchema,
  userDeactivateDraftSchema,
  userInviteDraftSchema,
  type ModuleName,
  type TierSurface,
} from '@tdpos/shared'

import { checkInsertLimit, checkSurfaceAccess } from '@/lib/entitlements/surface-access'
import { warnSafe } from '@/lib/safe-logger'
import { getServerSupabase } from '@/lib/supabase/server'

// `scaffold_only` is intentionally retained on the union for any future
// stub action that wants to return early without mutating. The six W0.8
// management surfaces (products / branches / categories / users / modules /
// devices) all run real DB writes today.
export type ScaffoldActionResult =
  | { ok: true; message: string; resourceId?: string }
  | {
      ok: false
      reason:
        | 'tier_locked'
        | 'unauthenticated'
        | 'forbidden'
        | 'supabase_unconfigured'
        | 'query_failed'
        | 'invalid_input'
        | 'limit_exceeded'
        | 'scaffold_only'
      message: string
    }

export type ScaffoldActionState = ScaffoldActionResult | null

export async function signOutAction() {
  try {
    const supabase = await getServerSupabase()
    await supabase.auth.signOut()
  } catch {
    // If env isn't configured the user has no session anyway; fall through.
  }
  redirect('/login')
}

export async function acknowledgePrivacyNoticeAction() {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return

  const acknowledgedAt = new Date().toISOString()
  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'privacy.notice_acknowledged',
    resourceType: 'privacy_notice',
    resourceId: ctx.businessId,
    after: {
      surface: 'web_dashboard',
      acknowledged_at: acknowledgedAt,
      policy_version: 'v0.9-scaffold',
    },
  })

  revalidatePath('/privacy')
  revalidatePath('/audit')
}

async function guardedScaffoldAccess(
  surface: TierSurface,
): Promise<ScaffoldActionResult | { ok: true }> {
  const access = await checkSurfaceAccess(surface)
  if (!access.ok) {
    return {
      ok: false,
      reason: access.reason,
      message: access.message,
    }
  }

  return { ok: true }
}

function textField(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function optionalTextField(formData: FormData, key: string): string | undefined {
  const value = textField(formData, key).trim()
  return value.length > 0 ? value : undefined
}

function invalidInput(message: string): ScaffoldActionResult {
  return {
    ok: false,
    reason: 'invalid_input',
    message,
  }
}

function requireExplicitConfirmation(
  formData: FormData,
  message = 'Confirm the action before submitting.',
): ScaffoldActionResult | null {
  return formData.get('confirm_action') === 'on' ? null : invalidInput(message)
}

function firstIssueMessage(result: { error: { issues: Array<{ message: string }> } }): string {
  return result.error.issues[0]?.message ?? 'Check the form fields and try again.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numberFromRecord(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function customerErasureMessage(reason: string | null): string {
  if (reason === 'forbidden') return 'Only an owner or manager can erase customer PII.'
  if (reason === 'unauthenticated') return 'Sign in to erase customer PII.'
  if (reason === 'account_not_provisioned') return 'Your account is not connected to a business.'
  if (reason === 'not_found') return 'Customer was not found for this business.'

  return 'Could not erase customer PII.'
}

interface CsvRecord {
  lineNumber: number
  values: Record<string, string>
}

function normalizeCsvHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)

  return rows
}

function parseCatalogCsv(
  input: string,
): { ok: true; records: CsvRecord[] } | { ok: false; message: string } {
  const rows = parseCsvRows(input)
  if (rows.length < 2) {
    return { ok: false, message: 'CSV needs a header row and at least one product row.' }
  }

  const headers = rows[0]?.map(normalizeCsvHeader) ?? []
  if (!headers.includes('name') && !headers.includes('product_name')) {
    return { ok: false, message: 'CSV header must include name or product_name.' }
  }

  const records = rows.slice(1).map((values, index) => {
    const record = headers.reduce(
      (acc, header, headerIndex) => {
        if (header.length > 0) acc[header] = values[headerIndex]?.trim() ?? ''
        return acc
      },
      {} as Record<string, string>,
    )

    return { lineNumber: index + 2, values: record }
  })

  return { ok: true, records }
}

function csvValue(values: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = values[key]
    if (value && value.trim().length > 0) return value.trim()
  }
  return ''
}

function csvOptionalValue(values: Record<string, string>, ...keys: string[]): string | undefined {
  const value = csvValue(values, ...keys)
  return value.length > 0 ? value : undefined
}

function csvBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase())
}

const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePairingCode(): string {
  let value = ''
  for (let index = 0; index < 8; index += 1) {
    value += PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)]
  }
  return value
}

function pairingCodeHash(value: string): string {
  return createHash('sha256').update(normalizeDevicePairingCode(value), 'utf8').digest('hex')
}

// Resolves the caller's auth.uid + business_id for management actions. The
// helper consolidates two RPC / claims fetches that every promoted action
// would otherwise duplicate. On failure the result is shaped as a regular
// ScaffoldActionResult so the caller can `return` it directly.
async function resolveCallerContext(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
): Promise<
  { ok: true; userId: string; businessId: string } | { ok: false; result: ScaffoldActionResult }
> {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims?.sub) {
    return {
      ok: false,
      result: { ok: false, reason: 'unauthenticated', message: 'Sign in to continue.' },
    }
  }
  const userId = claimsData.claims.sub as string

  const { data: businessId, error: businessError } = await supabase.rpc('current_business_id')
  if (businessError || !businessId) {
    return {
      ok: false,
      result: {
        ok: false,
        reason: 'query_failed',
        message: businessError?.message ?? 'No business found for this user.',
      },
    }
  }

  return { ok: true, userId, businessId: businessId as string }
}

// Best-effort audit-log INSERT. Failures here log a warning and return —
// the caller's mutation has already succeeded; the audit row is a trail,
// not the source of truth. ADR-014 says audit views render keys-only by
// default, so storing the full `after` object is acceptable.
async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  params: {
    businessId: string
    userId: string
    action: string
    resourceType: string
    resourceId: string
    after?: Record<string, unknown> | null
    before?: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    business_id: params.businessId,
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    before: params.before ?? null,
    after: params.after ?? null,
  })
  if (error) {
    warnSafe('[audit] failed to log', error, { action: params.action })
  }
}

export async function createProductScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = productManagementDraftSchema.safeParse({
    sku: optionalTextField(formData, 'sku'),
    name: textField(formData, 'name'),
    price_per_piece: textField(formData, 'price_per_piece'),
    price_per_pack: optionalTextField(formData, 'price_per_pack'),
    stock_pieces: textField(formData, 'stock_pieces'),
    pieces_per_pack: textField(formData, 'pieces_per_pack') || '1',
    unit_label: textField(formData, 'unit_label') || 'pc',
    is_tingi: formData.get('is_tingi') === 'on',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  const access = await guardedScaffoldAccess('web.products')
  if (!access.ok) return access

  const limitAccess = await checkInsertLimit({ table: 'products', limit: 'products' })
  if (!limitAccess.ok) {
    return { ok: false, reason: limitAccess.reason, message: limitAccess.message }
  }

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert({
      business_id: ctx.businessId,
      sku: draft.data.sku ?? null,
      name: draft.data.name,
      price_per_piece: draft.data.price_per_piece,
      price_per_pack: draft.data.price_per_pack ?? null,
      stock_pieces: draft.data.stock_pieces,
      pieces_per_pack: draft.data.pieces_per_pack,
      unit_label: draft.data.unit_label,
      is_tingi: draft.data.is_tingi,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return {
      ok: false,
      reason: 'query_failed',
      message: insertError?.message ?? 'Could not create product.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'product.create',
    resourceType: 'product',
    resourceId: inserted.id as string,
    after: { name: draft.data.name, price_per_piece: draft.data.price_per_piece },
  })

  revalidatePath('/products')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Created "${draft.data.name}".`,
    resourceId: inserted.id as string,
  }
}

export async function importProductsCsvScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = productBulkImportDraftSchema.safeParse({
    catalog_csv: textField(formData, 'catalog_csv'),
  })
  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  const parsedCsv = parseCatalogCsv(draft.data.catalog_csv)
  if (!parsedCsv.ok) return invalidInput(parsedCsv.message)

  if (parsedCsv.records.length > 100) {
    return invalidInput('Import up to 100 products per batch.')
  }

  const parsedProducts = parsedCsv.records.map((record) => {
    const parsed = productManagementDraftSchema.safeParse({
      sku: csvOptionalValue(record.values, 'sku'),
      name: csvValue(record.values, 'name', 'product_name', 'product'),
      price_per_piece: csvValue(record.values, 'price_per_piece', 'piece_price', 'price'),
      price_per_pack: csvOptionalValue(record.values, 'price_per_pack', 'pack_price'),
      stock_pieces: csvValue(record.values, 'stock_pieces', 'stock', 'qty', 'quantity'),
      pieces_per_pack: csvValue(record.values, 'pieces_per_pack', 'pack_size') || '1',
      unit_label: csvValue(record.values, 'unit_label', 'unit') || 'pc',
      is_tingi: csvBoolean(csvValue(record.values, 'is_tingi', 'tingi')),
    })

    return { lineNumber: record.lineNumber, parsed }
  })

  const invalidRow = parsedProducts.find((row) => !row.parsed.success)
  if (invalidRow && !invalidRow.parsed.success) {
    return invalidInput(`Line ${invalidRow.lineNumber}: ${firstIssueMessage(invalidRow.parsed)}`)
  }

  const products = parsedProducts.map((row) => {
    if (!row.parsed.success) throw new Error('validated_above')
    return row.parsed.data
  })

  if (products.length === 0) return invalidInput('CSV did not contain any product rows.')

  const access = await guardedScaffoldAccess('web.products')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', ctx.businessId)

  if (countError) {
    return { ok: false, reason: 'query_failed', message: countError.message }
  }

  const requestedCount = (count ?? 0) + products.length
  const { error: limitError } = await supabase.rpc('assert_business_limit', {
    p_business_id: ctx.businessId,
    p_limit_name: 'products',
    p_requested_count: requestedCount,
  })
  if (limitError) {
    return {
      ok: false,
      reason: limitError.message.startsWith('limit_exceeded:') ? 'limit_exceeded' : 'query_failed',
      message: limitError.message,
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(
      products.map((product) => ({
        business_id: ctx.businessId,
        sku: product.sku ?? null,
        name: product.name,
        price_per_piece: product.price_per_piece,
        price_per_pack: product.price_per_pack ?? null,
        stock_pieces: product.stock_pieces,
        pieces_per_pack: product.pieces_per_pack,
        unit_label: product.unit_label,
        is_tingi: product.is_tingi,
      })),
    )
    .select('id, name')

  if (insertError || !inserted) {
    return {
      ok: false,
      reason: 'query_failed',
      message: insertError?.message ?? 'Could not import products.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'product.bulk_import',
    resourceType: 'product_catalog',
    resourceId: ctx.businessId,
    after: {
      imported_count: inserted.length,
      names_sample: inserted.slice(0, 5).map((row) => row.name),
    },
  })

  revalidatePath('/products')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Imported ${inserted.length.toLocaleString('en-PH')} products.`,
    resourceId: ctx.businessId,
  }
}

export async function createBranchScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = branchManagementDraftSchema.safeParse({
    name: textField(formData, 'name'),
    branch_code: optionalTextField(formData, 'branch_code'),
    address: optionalTextField(formData, 'address'),
    region: optionalTextField(formData, 'region'),
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  const access = await guardedScaffoldAccess('web.branches')
  if (!access.ok) return access

  const limitAccess = await checkInsertLimit({ table: 'branches', limit: 'branches' })
  if (!limitAccess.ok) {
    return { ok: false, reason: limitAccess.reason, message: limitAccess.message }
  }

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data: inserted, error: insertError } = await supabase
    .from('branches')
    .insert({
      business_id: ctx.businessId,
      name: draft.data.name,
      branch_code: draft.data.branch_code ?? null,
      address: draft.data.address ?? null,
      region: draft.data.region ?? null,
      is_active: true,
    })
    .select('id, branch_code')
    .single()

  if (insertError || !inserted) {
    return {
      ok: false,
      reason: 'query_failed',
      message: insertError?.message ?? 'Could not create branch.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'branch.create',
    resourceType: 'branch',
    resourceId: inserted.id as string,
    after: {
      name: draft.data.name,
      branch_code: (inserted as { branch_code?: string }).branch_code ?? draft.data.branch_code,
      region: draft.data.region ?? null,
    },
  })

  revalidatePath('/branches')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Created branch "${draft.data.name}".`,
    resourceId: inserted.id as string,
  }
}

export async function createCategoryScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = categoryManagementDraftSchema.safeParse({
    name: textField(formData, 'name'),
    color: optionalTextField(formData, 'color'),
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  // Categories share the `web.products` surface gate. There is no separate
  // category limit because categories are bounded by product cardinality.
  const access = await guardedScaffoldAccess('web.products')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data: inserted, error: insertError } = await supabase
    .from('categories')
    .insert({
      business_id: ctx.businessId,
      name: draft.data.name,
      color: draft.data.color ?? null,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return {
      ok: false,
      reason: 'query_failed',
      message: insertError?.message ?? 'Could not create category.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'category.create',
    resourceType: 'category',
    resourceId: inserted.id as string,
    after: { name: draft.data.name, color: draft.data.color ?? null },
  })

  revalidatePath('/products')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Created category "${draft.data.name}".`,
    resourceId: inserted.id as string,
  }
}

export async function inviteUserScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const phone = normalizePhPhone(textField(formData, 'phone'))
  const draft = userInviteDraftSchema.safeParse({
    phone,
    role: textField(formData, 'role') || 'cashier',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  const access = await guardedScaffoldAccess('web.users')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  // Combined limit: count provisioned users + open pending invites and
  // assert +1 fits under businesses.max_users. The RPC handles the JOIN
  // logic so the action stays focused on validation + insert.
  const { data: population, error: populationError } = await supabase.rpc(
    'business_user_population',
    { p_business_id: ctx.businessId },
  )
  if (populationError) {
    return { ok: false, reason: 'query_failed', message: populationError.message }
  }
  const requestedCount = (typeof population === 'number' ? population : 0) + 1
  const { error: limitError } = await supabase.rpc('assert_business_limit', {
    p_business_id: ctx.businessId,
    p_limit_name: 'users',
    p_requested_count: requestedCount,
  })
  if (limitError) {
    return {
      ok: false,
      reason: limitError.message.startsWith('limit_exceeded:') ? 'limit_exceeded' : 'query_failed',
      message: limitError.message,
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('pending_invites')
    .insert({
      business_id: ctx.businessId,
      phone: draft.data.phone,
      role: draft.data.role,
      invited_by: ctx.userId,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    // Postgres `23505` (unique_violation) lands here when the partial
    // unique index `idx_pending_invites_open` rejects a duplicate open
    // invite for the same (business, phone). Fall through with the raw
    // message so the owner sees "duplicate key value..." and knows to
    // revoke the prior invite first.
    return {
      ok: false,
      reason: 'query_failed',
      message: insertError?.message ?? 'Could not create invite.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'user.invite',
    resourceType: 'pending_invite',
    resourceId: inserted.id as string,
    after: { phone: draft.data.phone, role: draft.data.role },
  })

  revalidatePath('/users')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Invited ${draft.data.role} ${draft.data.phone}.`,
    resourceId: inserted.id as string,
  }
}

export async function deactivateUserScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = userDeactivateDraftSchema.safeParse({
    user_id: textField(formData, 'user_id'),
    reason: optionalTextField(formData, 'reason'),
  })
  if (!draft.success) return invalidInput(firstIssueMessage(draft))
  const confirmationError = requireExplicitConfirmation(formData)
  if (confirmationError) return confirmationError

  const access = await guardedScaffoldAccess('web.users')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  if (draft.data.user_id === ctx.userId) {
    return invalidInput('You cannot deactivate your own account.')
  }

  const [{ data: actor }, { data: target, error: targetError }] = await Promise.all([
    supabase.from('users').select('role').eq('id', ctx.userId).maybeSingle(),
    supabase
      .from('users')
      .select('id, role, phone, is_active')
      .eq('id', draft.data.user_id)
      .maybeSingle(),
  ])

  if (targetError) {
    return { ok: false, reason: 'query_failed', message: targetError.message }
  }
  if (!target) {
    return invalidInput('Choose an active staff account from this business.')
  }

  const actorRole = (actor as { role?: string } | null)?.role ?? 'cashier'
  const targetRole = (target as { role?: string } | null)?.role ?? 'cashier'
  if (targetRole === 'owner') {
    return invalidInput('Owner accounts are not deactivated from this scaffold.')
  }
  if (actorRole === 'manager' && targetRole === 'manager') {
    return invalidInput('Managers cannot deactivate other managers.')
  }
  if ((target as { is_active?: boolean }).is_active === false) {
    return {
      ok: true,
      message: 'User is already inactive.',
      resourceId: draft.data.user_id,
    }
  }

  const deactivatedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_active: false,
      deactivated_at: deactivatedAt,
      deactivated_by: ctx.userId,
      deactivation_reason: draft.data.reason ?? null,
    })
    .eq('id', draft.data.user_id)

  if (updateError) {
    return { ok: false, reason: 'query_failed', message: updateError.message }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'user.deactivate',
    resourceType: 'user',
    resourceId: draft.data.user_id,
    before: { role: targetRole, active: true },
    after: {
      role: targetRole,
      active: false,
      deactivated_at: deactivatedAt,
      reason_present: Boolean(draft.data.reason),
    },
  })

  revalidatePath('/users')
  revalidatePath('/audit')

  return {
    ok: true,
    message: 'User deactivated. Existing local devices will fail bootstrap on next sign-in.',
    resourceId: draft.data.user_id,
  }
}

export async function revokePendingInviteScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = pendingInviteRevokeDraftSchema.safeParse({
    invite_id: textField(formData, 'invite_id'),
    reason: optionalTextField(formData, 'reason'),
  })
  if (!draft.success) return invalidInput(firstIssueMessage(draft))
  const confirmationError = requireExplicitConfirmation(formData)
  if (confirmationError) return confirmationError

  const access = await guardedScaffoldAccess('web.users')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const revokedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('pending_invites')
    .update({
      revoked_at: revokedAt,
      revoked_by: ctx.userId,
      revocation_reason: draft.data.reason ?? null,
    })
    .eq('id', draft.data.invite_id)
    .is('consumed_at', null)
    .is('revoked_at', null)
    .select('id, role, phone')
    .maybeSingle()

  if (updateError) {
    return { ok: false, reason: 'query_failed', message: updateError.message }
  }
  if (!updated) {
    return invalidInput('Invite is already consumed, revoked, or not in this business.')
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'user.invite_revoke',
    resourceType: 'pending_invite',
    resourceId: draft.data.invite_id,
    before: { role: (updated as { role?: string }).role ?? null, open: true },
    after: {
      role: (updated as { role?: string }).role ?? null,
      open: false,
      revoked_at: revokedAt,
      reason_present: Boolean(draft.data.reason),
    },
  })

  revalidatePath('/users')
  revalidatePath('/audit')

  return {
    ok: true,
    message: 'Invite revoked.',
    resourceId: draft.data.invite_id,
  }
}

export async function eraseCustomerPiiScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = customerErasureDraftSchema.safeParse({
    customer_id: textField(formData, 'customer_id'),
    reason: optionalTextField(formData, 'reason'),
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))
  const confirmationError = requireExplicitConfirmation(formData)
  if (confirmationError) return confirmationError

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data, error } = await supabase.rpc('erase_customer_pii', {
    p_customer_id: draft.data.customer_id,
    p_reason: draft.data.reason ?? null,
  })

  if (error) {
    return {
      ok: false,
      reason: 'query_failed',
      message: 'Could not erase customer PII.',
    }
  }

  const rpcReason = isRecord(data) && typeof data.reason === 'string' ? data.reason : null
  if (!isRecord(data) || data.ok !== true) {
    return {
      ok: false,
      reason:
        rpcReason === 'forbidden' || rpcReason === 'unauthenticated' ? rpcReason : 'query_failed',
      message: customerErasureMessage(rpcReason),
    }
  }

  revalidatePath('/modules')
  revalidatePath('/audit')

  return {
    ok: true,
    message: data.already_erased
      ? 'Customer PII was already erased.'
      : 'Customer PII erased; transaction references were retained.',
    resourceId: draft.data.customer_id,
  }
}

export async function updateModulesScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const modules = (Object.keys(DEFAULT_MODULE_STATE) as ModuleName[]).reduce(
    (acc, key) => {
      acc[key] = formData.get(key) === 'on'
      return acc
    },
    {} as Record<ModuleName, boolean>,
  )
  const draft = moduleManagementDraftSchema.safeParse({ modules })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  const access = await guardedScaffoldAccess('web.modules')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  // Capture the prior module_state for the audit trail's `before` payload.
  // Best-effort: missing/error rows fall through with `before = null`.
  const { data: priorRow } = await supabase
    .from('businesses')
    .select('module_state')
    .eq('id', ctx.businessId)
    .maybeSingle()

  // The submitted module map is the *desired* per-tenant override. Tier
  // gating still happens at read-time via `resolveTierModuleState` in
  // `@tdpos/shared`, so a DB `true` for a module locked at the current
  // tier is silently clamped to false on render. Stored values stay as
  // submitted so an upgrade re-unlocks them automatically.
  const { error: updateError } = await supabase
    .from('businesses')
    .update({ module_state: draft.data.modules })
    .eq('id', ctx.businessId)

  if (updateError) {
    return { ok: false, reason: 'query_failed', message: updateError.message }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'business.modules_update',
    resourceType: 'business',
    resourceId: ctx.businessId,
    before: (priorRow as { module_state?: Record<string, boolean> } | null)?.module_state ?? null,
    after: draft.data.modules,
  })

  revalidatePath('/modules')
  revalidatePath('/audit')

  const enabledCount = Object.values(draft.data.modules).filter(Boolean).length
  return {
    ok: true,
    message: `Saved module state — ${enabledCount} module${enabledCount === 1 ? '' : 's'} enabled.`,
    resourceId: ctx.businessId,
  }
}

export async function createDevicePairingCodeAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = devicePairingCodeDraftSchema.safeParse({
    branch_id: textField(formData, 'branch_id'),
    cashier_code: textField(formData, 'cashier_code') || 'C01',
    device_name: optionalTextField(formData, 'device_name'),
    surface: textField(formData, 'surface') || 'mobile.tier_a_cashier',
    expires_minutes: textField(formData, 'expires_minutes') || '30',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

  if (SURFACE_LABELS[draft.data.surface].group !== 'mobile') {
    return invalidInput('Choose a mobile surface for this device.')
  }

  const access = await guardedScaffoldAccess('web.devices')
  if (!access.ok) return access

  const surfaceAccess = await guardedScaffoldAccess(draft.data.surface)
  if (!surfaceAccess.ok) return surfaceAccess

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('id, name, branch_code')
    .eq('id', draft.data.branch_id)
    .eq('is_active', true)
    .maybeSingle()

  if (branchError) {
    return { ok: false, reason: 'query_failed', message: branchError.message }
  }
  if (!branch) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: 'Choose an active branch before issuing a device code.',
    }
  }

  const { data: businessRow, error: businessError } = await supabase
    .from('businesses')
    .select('max_devices')
    .eq('id', ctx.businessId)
    .maybeSingle()

  if (businessError) {
    return { ok: false, reason: 'query_failed', message: businessError.message }
  }

  const [{ count: deviceCount, error: deviceCountError }, { count: codeCount, error: codeError }] =
    await Promise.all([
      supabase
        .from('business_devices')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'lost'),
      supabase
        .from('device_pairing_codes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString()),
    ])

  if (deviceCountError) {
    return { ok: false, reason: 'query_failed', message: deviceCountError.message }
  }
  if (codeError) {
    return { ok: false, reason: 'query_failed', message: codeError.message }
  }

  const maxDevices =
    typeof (businessRow as { max_devices?: unknown } | null)?.max_devices === 'number'
      ? (businessRow as { max_devices: number }).max_devices
      : null
  const requestedDevices = (deviceCount ?? 0) + (codeCount ?? 0) + 1
  if (maxDevices !== null && requestedDevices > maxDevices) {
    return {
      ok: false,
      reason: 'limit_exceeded',
      message: `Device limit exceeded: ${requestedDevices}/${maxDevices}. Mark a lost device first or upgrade.`,
    }
  }

  const expiresAt = new Date(Date.now() + draft.data.expires_minutes * 60_000).toISOString()
  const branchName = (branch as { name: string }).name
  const branchCode = (branch as { branch_code?: string }).branch_code
  if (!branchCode) {
    return {
      ok: false,
      reason: 'query_failed',
      message: 'Selected branch is missing a branch code.',
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generatePairingCode()
    const normalizedCode = normalizeDevicePairingCode(code)
    const { data: inserted, error: insertError } = await supabase
      .from('device_pairing_codes')
      .insert({
        business_id: ctx.businessId,
        branch_id: draft.data.branch_id,
        created_by: ctx.userId,
        pairing_code_hash: pairingCodeHash(normalizedCode),
        pairing_code_last4: normalizedCode.slice(-4),
        branch_code: branchCode,
        cashier_code: draft.data.cashier_code,
        device_name: draft.data.device_name ?? null,
        surface: draft.data.surface,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505' && attempt < 2) continue
      return {
        ok: false,
        reason: 'query_failed',
        message: insertError.message,
      }
    }
    if (!inserted) {
      return {
        ok: false,
        reason: 'query_failed',
        message: 'Could not issue device code.',
      }
    }

    await logAuditEvent(supabase, {
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: 'device_pairing_code.create',
      resourceType: 'device_pairing_code',
      resourceId: inserted.id as string,
      after: {
        branch_id: draft.data.branch_id,
        branch_code: branchCode,
        cashier_code: draft.data.cashier_code,
        device_name: draft.data.device_name ?? null,
        surface: draft.data.surface,
        expires_at: expiresAt,
        pairing_code_last4: normalizedCode.slice(-4),
      },
    })

    revalidatePath('/devices')
    revalidatePath('/audit')

    return {
      ok: true,
      message: `Device code ${code} issued for ${branchName} / ${draft.data.cashier_code}. It expires in ${draft.data.expires_minutes} minutes.`,
      resourceId: inserted.id as string,
    }
  }

  return {
    ok: false,
    reason: 'query_failed',
    message: 'Could not issue a unique device code.',
  }
}

export async function updateDeviceStatusScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = deviceManagementDraftSchema.safeParse({
    device_id: textField(formData, 'device_id'),
    status: textField(formData, 'status') || 'active',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))
  const confirmationError = requireExplicitConfirmation(formData)
  if (confirmationError) return confirmationError

  const access = await guardedScaffoldAccess('web.devices')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  // Capture the prior status for the audit trail. RLS scopes the read
  // to the caller's business, so a foreign device returns null and the
  // update below also returns null — same 404 path either way.
  const { data: priorRow } = await supabase
    .from('business_devices')
    .select('status, lost_reported_at, replacement_requested_at, recovery_note')
    .eq('id', draft.data.device_id)
    .maybeSingle()

  const statusPatch: Record<string, unknown> = { status: draft.data.status }
  if (draft.data.status === 'lost') {
    statusPatch.lost_reported_at = new Date().toISOString()
    statusPatch.lost_reported_by = ctx.userId
  } else if ((priorRow as { status?: string } | null)?.status === 'lost') {
    statusPatch.lost_reported_at = null
    statusPatch.lost_reported_by = null
    statusPatch.replacement_requested_at = null
    statusPatch.recovery_note = null
  }

  const { data: updated, error: updateError } = await supabase
    .from('business_devices')
    .update(statusPatch)
    .eq('id', draft.data.device_id)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return { ok: false, reason: 'query_failed', message: updateError.message }
  }
  if (!updated) {
    return {
      ok: false,
      reason: 'query_failed',
      message: 'Device not found in your business.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'device.status_update',
    resourceType: 'business_device',
    resourceId: draft.data.device_id,
    before: priorRow
      ? {
          status: (priorRow as { status: string }).status,
          lost_reported_at: (priorRow as { lost_reported_at: string | null }).lost_reported_at,
          replacement_requested_at: (priorRow as { replacement_requested_at: string | null })
            .replacement_requested_at,
          recovery_note: (priorRow as { recovery_note: string | null }).recovery_note,
        }
      : null,
    after: statusPatch,
  })

  revalidatePath('/devices')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Device set to ${draft.data.status}.`,
    resourceId: draft.data.device_id,
  }
}

export async function markDeviceLostForReplacementAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = deviceLostReplacementDraftSchema.safeParse({
    device_id: textField(formData, 'device_id'),
    recovery_note: optionalTextField(formData, 'recovery_note'),
    acknowledge_unsynced: formData.get('acknowledge_unsynced') === 'on',
    acknowledge_receipts: formData.get('acknowledge_receipts') === 'on',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))
  const confirmationError = requireExplicitConfirmation(formData)
  if (confirmationError) return confirmationError

  const access = await guardedScaffoldAccess('web.devices')
  if (!access.ok) return access

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ok: false, reason: 'supabase_unconfigured', message: 'Supabase is not configured.' }
  }

  const ctx = await resolveCallerContext(supabase)
  if (!ctx.ok) return ctx.result

  const { data: priorRow, error: readError } = await supabase
    .from('business_devices')
    .select(
      `id, install_id, device_name, status, last_seen_at, sync_snapshot,
       lost_reported_at, replacement_requested_at, recovery_note`,
    )
    .eq('id', draft.data.device_id)
    .maybeSingle()

  if (readError) {
    return { ok: false, reason: 'query_failed', message: readError.message }
  }
  if (!priorRow) {
    return {
      ok: false,
      reason: 'query_failed',
      message: 'Device not found in your business.',
    }
  }

  const syncSnapshot = isRecord(priorRow.sync_snapshot) ? priorRow.sync_snapshot : null
  const unsafeQueueRows =
    numberFromRecord(syncSnapshot, 'unsynced_rows') +
    numberFromRecord(syncSnapshot, 'failed_rows') +
    numberFromRecord(syncSnapshot, 'reviewable_rows')
  const receiptSequences = syncSnapshot?.receipt_sequences
  const hasReceiptSequenceSnapshot = Array.isArray(receiptSequences) && receiptSequences.length > 0

  if (unsafeQueueRows > 0 && !draft.data.acknowledge_unsynced) {
    return invalidInput(
      `This device last reported ${unsafeQueueRows} unsynced, failed, or reviewable local row${
        unsafeQueueRows === 1 ? '' : 's'
      }. Copy the local data export first, then acknowledge this risk.`,
    )
  }

  if (hasReceiptSequenceSnapshot && !draft.data.acknowledge_receipts) {
    return invalidInput(
      'Acknowledge the receipt sequence snapshot before preparing a replacement device.',
    )
  }

  const reportedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('business_devices')
    .update({
      status: 'lost',
      lost_reported_at: reportedAt,
      lost_reported_by: ctx.userId,
      replacement_requested_at: reportedAt,
      recovery_note: draft.data.recovery_note ?? null,
    })
    .eq('id', draft.data.device_id)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return { ok: false, reason: 'query_failed', message: updateError.message }
  }
  if (!updated) {
    return {
      ok: false,
      reason: 'query_failed',
      message: 'Device not found in your business.',
    }
  }

  await logAuditEvent(supabase, {
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: 'device.lost_replacement_prepare',
    resourceType: 'business_device',
    resourceId: draft.data.device_id,
    before: {
      status: priorRow.status as string,
      last_seen_at: (priorRow as { last_seen_at: string | null }).last_seen_at,
      lost_reported_at: (priorRow as { lost_reported_at: string | null }).lost_reported_at,
      replacement_requested_at: (priorRow as { replacement_requested_at: string | null })
        .replacement_requested_at,
      recovery_note: (priorRow as { recovery_note: string | null }).recovery_note,
    },
    after: {
      status: 'lost',
      lost_reported_at: reportedAt,
      replacement_requested_at: reportedAt,
      unsafe_queue_rows: unsafeQueueRows,
      receipt_sequence_snapshots: hasReceiptSequenceSnapshot ? receiptSequences : [],
      recovery_note: draft.data.recovery_note ?? null,
    },
  })

  revalidatePath('/devices')
  revalidatePath('/sync')
  revalidatePath('/audit')

  return {
    ok: true,
    message:
      'Device marked lost. Its slot is released for a replacement heartbeat; keep the local data export until support closes recovery.',
    resourceId: draft.data.device_id,
  }
}
