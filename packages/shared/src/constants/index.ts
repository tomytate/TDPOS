// @tdpos/shared — Constants

import type {
  LegacySubscriptionTier,
  ModuleName,
  SubscriptionTier,
  TierSurface,
} from '../types/index'

export const APP_NAME = 'TD POS'
export const APP_TAGLINE = 'Tama ang stock mo. Lagi.'
export const SPEC_VERSION = '5.0'

// Free tier limits — kept for backwards compatibility with v0.1 web queries.
// New code reads `TIER_DEFINITIONS[tier].max*` via `getTierDefinition()` so
// per-tenant entitlement is sourced from the database, not a global default.
export const FREE_MAX_PRODUCTS = 50
export const FREE_MAX_DEVICES = 1
export const FREE_MAX_USERS = 1

// Sync
export const SYNC_RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000] as const
export const SYNC_MAX_RETRIES = 10
export const STALE_OPERATION_TIMEOUT_SECONDS = 60

// Receipt
export const RECEIPT_SEQUENCE_PAD_LENGTH = 6
export const RECEIPT_DATE_FORMAT = 'yyyyMMdd'

// Inventory
export const DEFAULT_PIECES_PER_PACK = 1

// Default tingi templates
export const TINGI_TEMPLATES = [
  { name: 'Cigarettes (per stick)', pieces_per_pack: 20, unit_label: 'stick' },
  { name: 'Shampoo sachets', pieces_per_pack: 12, unit_label: 'sachet' },
  { name: 'Coffee sachets', pieces_per_pack: 10, unit_label: 'sachet' },
  { name: 'Candies (per piece)', pieces_per_pack: 1, unit_label: 'piece' },
  { name: 'Drinks (per bottle)', pieces_per_pack: 24, unit_label: 'bottle' },
] as const

// Module defaults (all OFF for new businesses)
export const DEFAULT_MODULE_STATE = {
  utang: false,
  customer_sms: false,
  loyalty: false,
  supplier_management: false,
  multi_branch: false,
  franchise_management: false,
  payroll: false,
  accounting_integration: false,
  public_api: false,
} as const

// BIR receipt copy — centralized so the language can flip in ONE place
// the day a business + device pair becomes accredited. Until accreditation,
// only "BIR-ready" / "Provisional receipt" wording is permitted.
export const BIR_RECEIPT_HEADER = 'PROVISIONAL RECEIPT'
export const BIR_RECEIPT_FOOTER = 'BIR-ready receipt format'
export const BIR_RECEIPT_NOTE = 'Designed to BIR specification. BIR accreditation pending.'
export const APP_BRANDING_FOOTER = 'Powered by TD POS'

// Denomination quick-tap grid for cash payments (₱)
export const CASH_DENOMINATIONS = [20, 50, 100, 200, 250, 300, 500, 1000] as const

// ============================================================================
// 5-tier TD POS scaffold
// ----------------------------------------------------------------------------
// Single source of truth for tier identity, limits, module unlocks, and the
// surfaces enabled at each tier. Mobile auth-bootstrap, web management queries,
// and the eventual paywall UI all read from `TIER_DEFINITIONS`. Database rows
// carry the canonical tier string + per-tenant overrides for limits + module
// state; `TIER_DEFINITIONS` is the *default* — DB values win when present.
// ============================================================================

export const TIER_A_FREE: SubscriptionTier = 'tier_a_free'

export const SUBSCRIPTION_TIERS = [
  'tier_a_free',
  'tier_b_pro',
  'tier_c_plus',
  'tier_d_premium',
  'tier_e_enterprise',
] as const satisfies readonly SubscriptionTier[]

// Old six-tier names map onto the canonical five. Migration-only — new
// businesses provision into the canonical names directly.
export const LEGACY_TIER_MAP: Record<LegacySubscriptionTier, SubscriptionTier> = {
  free: 'tier_a_free',
  starter: 'tier_b_pro',
  pro: 'tier_b_pro',
  growth: 'tier_c_plus',
  business: 'tier_d_premium',
  enterprise: 'tier_e_enterprise',
}

export interface TierDefinition {
  tier: SubscriptionTier
  label: string
  shortLabel: string
  description: string
  // Hard limits — null means unlimited (kept JSON-friendly; no Infinity).
  maxProducts: number | null
  maxBranches: number | null
  maxDevices: number | null
  maxUsers: number | null
  // Modules unlocked at this tier; missing entries = OFF.
  modules: Partial<Record<ModuleName, boolean>>
  // Surfaces this tier sees. Owner-monitoring surfaces are present at every
  // tier so owners can always read; mutating surfaces are tier-gated.
  surfaces: readonly TierSurface[]
}

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
  tier_a_free: {
    tier: 'tier_a_free',
    label: 'Tier A — Free',
    shortLabel: 'Free',
    description:
      'Solo cashier on a single phone. Inventory + sales + sync. Owner monitoring on web; no paid modules.',
    maxProducts: 50,
    maxBranches: 1,
    maxDevices: 1,
    maxUsers: 1,
    modules: {},
    surfaces: ['mobile.tier_a_cashier', 'web.overview'],
  },
  tier_b_pro: {
    tier: 'tier_b_pro',
    label: 'Tier B — Pro',
    shortLabel: 'Pro',
    description:
      'Tablet POS with shift handoff and owner lanes. Utang and customer SMS unlocked. One branch, multiple cashiers.',
    maxProducts: 500,
    maxBranches: 1,
    maxDevices: 3,
    maxUsers: 5,
    modules: {
      utang: true,
      customer_sms: true,
    },
    surfaces: [
      'mobile.tier_a_cashier',
      'mobile.tablet_pos',
      'mobile.owner_lanes',
      'mobile.shift_login',
      'mobile.shift_handoff',
      'web.overview',
      'web.products',
      'web.users',
      'web.modules',
      'web.audit',
    ],
  },
  tier_c_plus: {
    tier: 'tier_c_plus',
    label: 'Tier C — Plus',
    shortLabel: 'Plus',
    description:
      'Convenience-store layout with manager-phone overrides. Multi-branch, supplier management, loyalty.',
    maxProducts: 5000,
    maxBranches: 3,
    maxDevices: 10,
    maxUsers: 20,
    modules: {
      utang: true,
      customer_sms: true,
      loyalty: true,
      supplier_management: true,
      multi_branch: true,
    },
    surfaces: [
      'mobile.tier_a_cashier',
      'mobile.tablet_pos',
      'mobile.owner_lanes',
      'mobile.shift_login',
      'mobile.shift_handoff',
      'mobile.convenience_counter',
      'mobile.manager_phone',
      'web.overview',
      'web.products',
      'web.branches',
      'web.users',
      'web.modules',
      'web.sync',
      'web.audit',
      'web.exports',
    ],
  },
  tier_d_premium: {
    tier: 'tier_d_premium',
    label: 'Tier D — Premium',
    shortLabel: 'Premium',
    description:
      'Supermarket-grade: scanner counters, customer display, weighted PLUs, back-office audit. Payroll + accounting integration unlocked.',
    maxProducts: 50000,
    maxBranches: 10,
    maxDevices: 50,
    maxUsers: 100,
    modules: {
      utang: true,
      customer_sms: true,
      loyalty: true,
      supplier_management: true,
      multi_branch: true,
      payroll: true,
      accounting_integration: true,
    },
    surfaces: [
      'mobile.tier_a_cashier',
      'mobile.tablet_pos',
      'mobile.owner_lanes',
      'mobile.shift_login',
      'mobile.shift_handoff',
      'mobile.convenience_counter',
      'mobile.manager_phone',
      'mobile.supermarket_counter',
      'mobile.customer_display',
      'mobile.backoffice_audit',
      'mobile.weighted_plu',
      'web.overview',
      'web.products',
      'web.branches',
      'web.users',
      'web.modules',
      'web.sync',
      'web.audit',
      'web.exports',
    ],
  },
  tier_e_enterprise: {
    tier: 'tier_e_enterprise',
    label: 'Tier E — Enterprise',
    shortLabel: 'Enterprise',
    description:
      'Franchise + HQ rollup, returns/warranty, self-service kiosk, public API. Unlimited products / branches / devices / users.',
    maxProducts: null,
    maxBranches: null,
    maxDevices: null,
    maxUsers: null,
    modules: {
      utang: true,
      customer_sms: true,
      loyalty: true,
      supplier_management: true,
      multi_branch: true,
      franchise_management: true,
      payroll: true,
      accounting_integration: true,
      public_api: true,
    },
    surfaces: [
      'mobile.tier_a_cashier',
      'mobile.tablet_pos',
      'mobile.owner_lanes',
      'mobile.shift_login',
      'mobile.shift_handoff',
      'mobile.convenience_counter',
      'mobile.manager_phone',
      'mobile.supermarket_counter',
      'mobile.customer_display',
      'mobile.backoffice_audit',
      'mobile.weighted_plu',
      'mobile.hq_rollup',
      'mobile.self_service_kiosk',
      'mobile.returns_warranty',
      'web.overview',
      'web.products',
      'web.branches',
      'web.users',
      'web.modules',
      'web.sync',
      'web.audit',
      'web.exports',
      'web.hq',
    ],
  },
}

// ----- Tier helpers ----------------------------------------------------------

export function isSubscriptionTier(value: string | null | undefined): value is SubscriptionTier {
  return typeof value === 'string' && SUBSCRIPTION_TIERS.includes(value as SubscriptionTier)
}

export function isLegacySubscriptionTier(
  value: string | null | undefined,
): value is LegacySubscriptionTier {
  return typeof value === 'string' && value in LEGACY_TIER_MAP
}

// Always returns a canonical tier; unknown / null / legacy values fall back
// to TIER_A_FREE so downstream code can assume a valid tier.
export function normalizeSubscriptionTier(value: string | null | undefined): SubscriptionTier {
  if (isSubscriptionTier(value)) return value
  if (isLegacySubscriptionTier(value)) return LEGACY_TIER_MAP[value]
  return TIER_A_FREE
}

export function getTierDefinition(tier: SubscriptionTier): TierDefinition {
  return TIER_DEFINITIONS[tier]
}

// Canonical fully-shaped module state for a tier (every module key present,
// boolean value reflects whether the tier unlocks it). Use this as the
// merge baseline; per-tenant DB overrides take precedence for runtime gating.
export function getTierModuleState(tier: SubscriptionTier): Record<ModuleName, boolean> {
  const tierModules = TIER_DEFINITIONS[tier].modules
  return {
    utang: tierModules.utang ?? false,
    customer_sms: tierModules.customer_sms ?? false,
    loyalty: tierModules.loyalty ?? false,
    supplier_management: tierModules.supplier_management ?? false,
    multi_branch: tierModules.multi_branch ?? false,
    franchise_management: tierModules.franchise_management ?? false,
    payroll: tierModules.payroll ?? false,
    accounting_integration: tierModules.accounting_integration ?? false,
    public_api: tierModules.public_api ?? false,
  }
}

export function isTierSurfaceEnabled(tier: SubscriptionTier, surface: TierSurface): boolean {
  return TIER_DEFINITIONS[tier].surfaces.includes(surface)
}

// ----- Surface registry ------------------------------------------------------
// Human-readable label + one-line positioning for every TierSurface. Pages
// and upgrade explorers read from this; adding a new surface ID means adding
// an entry here so TypeScript exhaustiveness keeps the lists in sync.

export interface TierSurfaceMeta {
  label: string
  description: string
  // 'mobile' | 'web' | 'marketing' — derived from the surface namespace but
  // pre-baked here to avoid string-splitting at every call site.
  group: 'mobile' | 'web' | 'marketing'
}

export const SURFACE_LABELS: Record<TierSurface, TierSurfaceMeta> = {
  // Tier A — included in every tier above too.
  'mobile.tier_a_cashier': {
    label: 'Solo cashier',
    description: 'Single-phone cashier flow with offline sales + sync.',
    group: 'mobile',
  },
  // Tier B — Pro additions
  'mobile.tablet_pos': {
    label: 'Tablet POS',
    description: 'Larger landscape layout with split product grid + cart drawer.',
    group: 'mobile',
  },
  'mobile.owner_lanes': {
    label: 'Owner lanes',
    description: 'Manager-monitored cashier lanes with live sales feed.',
    group: 'mobile',
  },
  'mobile.shift_login': {
    label: 'Shift login',
    description: 'Cashier shift PIN with handoff metadata + open-shift guards.',
    group: 'mobile',
  },
  'mobile.shift_handoff': {
    label: 'Shift handoff',
    description: 'End-of-shift cash count + variance log + signed handoff.',
    group: 'mobile',
  },
  // Tier C — Plus additions
  'mobile.convenience_counter': {
    label: 'Convenience counter',
    description: 'Drink-cooler / shelf-aware product layout for convenience stores.',
    group: 'mobile',
  },
  'mobile.manager_phone': {
    label: 'Manager override',
    description: 'On-device manager approvals (refunds, voids) via biometric / PIN.',
    group: 'mobile',
  },
  // Tier D — Premium additions
  'mobile.supermarket_counter': {
    label: 'Supermarket counter',
    description: 'Scanner-driven counter UI with belt mode, loyalty lookup, returns.',
    group: 'mobile',
  },
  'mobile.customer_display': {
    label: 'Customer display',
    description: 'Second-screen / paired tablet showing live cart + total to customer.',
    group: 'mobile',
  },
  'mobile.backoffice_audit': {
    label: 'Back-office audit',
    description: 'Owner audit trail with sale, void, and price-change history.',
    group: 'mobile',
  },
  'mobile.weighted_plu': {
    label: 'Weighted PLUs',
    description: 'Scale-integrated produce + deli items with PLU code lookup.',
    group: 'mobile',
  },
  // Tier E — Enterprise additions
  'mobile.hq_rollup': {
    label: 'HQ rollup',
    description: 'Multi-store consolidated dashboard for franchise / chain HQ.',
    group: 'mobile',
  },
  'mobile.self_service_kiosk': {
    label: 'Self-service kiosk',
    description: 'Customer-facing kiosk mode with locked-down checkout flow.',
    group: 'mobile',
  },
  'mobile.returns_warranty': {
    label: 'Returns + warranty',
    description: 'Receipt lookup, return reason codes, warranty claim metadata.',
    group: 'mobile',
  },
  // Web surfaces
  'web.overview': {
    label: 'Overview',
    description: 'Today’s sales, low-stock alerts, sync health summary.',
    group: 'web',
  },
  'web.products': {
    label: 'Products',
    description: 'Catalog management — stock, tingi units, prices.',
    group: 'web',
  },
  'web.branches': {
    label: 'Branches',
    description: 'Branch directory + activation status.',
    group: 'web',
  },
  'web.users': {
    label: 'Users',
    description: 'Cashier / manager / owner access management.',
    group: 'web',
  },
  'web.modules': {
    label: 'Modules',
    description: 'Subscription tier + optional capability toggles.',
    group: 'web',
  },
  'web.sync': {
    label: 'Sync health',
    description: 'Per-device sync queue depth, last sync, error stream.',
    group: 'web',
  },
  'web.audit': {
    label: 'Audit log',
    description: 'Immutable audit trail of mutations, keyed-only by default.',
    group: 'web',
  },
  'web.exports': {
    label: 'Exports',
    description: 'CSV + PDF sales exports with date-range filters.',
    group: 'web',
  },
  'web.hq': {
    label: 'HQ rollup',
    description: 'Cross-business dashboards for franchise / chain operators.',
    group: 'web',
  },
  // Marketing
  'marketing.pricing': {
    label: 'Pricing',
    description: 'Public tier comparison page.',
    group: 'marketing',
  },
}

// Returns the minimum SubscriptionTier that unlocks `surface`. Used by upgrade
// explorers to label "unlocks at <tier>" for currently-locked surfaces.
export function getMinimumTierForSurface(surface: TierSurface): SubscriptionTier {
  for (const tier of SUBSCRIPTION_TIERS) {
    if (isTierSurfaceEnabled(tier, surface)) return tier
  }
  // Surface allowlists are exhaustive across the 5 tiers; this fallback only
  // fires if the type system has been bypassed (e.g. cast-from-string).
  return TIER_A_FREE
}
