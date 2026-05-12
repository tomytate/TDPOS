'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  DEFAULT_MODULE_STATE,
  branchManagementDraftSchema,
  categoryManagementDraftSchema,
  customerErasureDraftSchema,
  deviceManagementDraftSchema,
  moduleManagementDraftSchema,
  normalizePhPhone,
  productManagementDraftSchema,
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

function firstIssueMessage(result: { error: { issues: Array<{ message: string }> } }): string {
  return result.error.issues[0]?.message ?? 'Check the form fields and try again.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function customerErasureMessage(reason: string | null): string {
  if (reason === 'forbidden') return 'Only an owner or manager can erase customer PII.'
  if (reason === 'unauthenticated') return 'Sign in to erase customer PII.'
  if (reason === 'account_not_provisioned') return 'Your account is not connected to a business.'
  if (reason === 'not_found') return 'Customer was not found for this business.'

  return 'Could not erase customer PII.'
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

export async function createBranchScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = branchManagementDraftSchema.safeParse({
    name: textField(formData, 'name'),
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
      address: draft.data.address ?? null,
      region: draft.data.region ?? null,
      is_active: true,
    })
    .select('id')
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
    after: { name: draft.data.name, region: draft.data.region ?? null },
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

export async function eraseCustomerPiiScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = customerErasureDraftSchema.safeParse({
    customer_id: textField(formData, 'customer_id'),
    reason: optionalTextField(formData, 'reason'),
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

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

export async function updateDeviceStatusScaffoldAction(
  _previousState: ScaffoldActionState,
  formData: FormData,
): Promise<ScaffoldActionResult> {
  const draft = deviceManagementDraftSchema.safeParse({
    device_id: textField(formData, 'device_id'),
    status: textField(formData, 'status') || 'active',
  })

  if (!draft.success) return invalidInput(firstIssueMessage(draft))

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
    .select('status')
    .eq('id', draft.data.device_id)
    .maybeSingle()

  const { data: updated, error: updateError } = await supabase
    .from('business_devices')
    .update({ status: draft.data.status })
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
    before: priorRow ? { status: (priorRow as { status: string }).status } : null,
    after: { status: draft.data.status },
  })

  revalidatePath('/devices')
  revalidatePath('/audit')

  return {
    ok: true,
    message: `Device set to ${draft.data.status}.`,
    resourceId: draft.data.device_id,
  }
}
