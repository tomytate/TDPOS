// Surface scaffold metadata registry — maps every TierSurface to its
// label, description, icon, tier, and action status. Used by the surface
// preview cards and the mobile surface router for dispatch.

import type { TierSurface } from '@tdpos/shared'

export type MobileTierSurface = Extract<TierSurface, `mobile.${string}`>

interface SurfaceAction {
  label: string
  status: 'scaffold' | 'blocked' | 'phase-0.9'
}

export interface SurfaceScaffold {
  surface: MobileTierSurface
  scaffoldPhase: '0.5' | '0.7' | '0.8'
  headline: string
  primaryWorkflow: string
  offlineContract: string
  dataFeeds: readonly string[]
  actions: readonly SurfaceAction[]
  acceptanceBacklog: readonly string[]
}

export const MOBILE_SURFACE_SCAFFOLDS: Record<MobileTierSurface, SurfaceScaffold> = {
  'mobile.tier_a_cashier': {
    surface: 'mobile.tier_a_cashier',
    scaffoldPhase: '0.5',
    headline: 'Phone-first sari-sari sale loop',
    primaryWorkflow:
      'Cashier scans or taps products, reviews the cart, records payment, and shows a provisional receipt without needing the network.',
    offlineContract:
      'All sale writes stay local first: sales, sale_items, product stock decrement, inventory_logs, receipt_sequence, and sync_queue rows.',
    dataFeeds: ['Local SQLite products', 'Cart store', 'Receipt sequence', 'Sync queue health'],
    actions: [
      { label: 'Open product grid', status: 'scaffold' },
      { label: 'Checkout flow', status: 'scaffold' },
      { label: 'Receipt view', status: 'scaffold' },
    ],
    acceptanceBacklog: [
      'Visual parity against Tier A canvas',
      'Touch targets and screen-reader pass',
      'Airplane-mode device run',
    ],
  },
  'mobile.tablet_pos': {
    surface: 'mobile.tablet_pos',
    scaffoldPhase: '0.7',
    headline: 'Landscape counter for mini-marts',
    primaryWorkflow:
      'Tablet cashier sees product search, category lanes, active cart, and payment summary in one wide counter layout.',
    offlineContract:
      'Uses the same local checkout transaction as Tier A; tablet layout must never introduce a second sale path.',
    dataFeeds: ['Local SQLite catalog', 'Cart store', 'Active shift', 'Low-stock badges'],
    actions: [
      { label: 'Open tablet register', status: 'scaffold' },
      { label: 'Attach barcode scanner', status: 'blocked' },
      { label: 'Save suspended cart', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Tablet landscape screenshot parity',
      '500 SKU fast-scroll check',
      'Keyboard / scanner focus behavior',
    ],
  },
  'mobile.owner_lanes': {
    surface: 'mobile.owner_lanes',
    scaffoldPhase: '0.7',
    headline: 'Owner view of active cashier lanes',
    primaryWorkflow:
      'Owner or manager sees open shifts, lane totals, unsynced rows, and exception flags across the store floor.',
    offlineContract:
      'Reads local shift and sync summaries on-device; remote lane rollup appears only after sync is available.',
    dataFeeds: ['Shift state', 'Local sales totals', 'Sync health', 'Cached user roles'],
    actions: [
      { label: 'View lane board', status: 'scaffold' },
      { label: 'Drill into lane', status: 'scaffold' },
      { label: 'Manager override', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Manager-only route guard',
      'No PII in lane cards',
      'Sync-stale state copy review',
    ],
  },
  'mobile.shift_login': {
    surface: 'mobile.shift_login',
    scaffoldPhase: '0.7',
    headline: 'Cashier shift start gate',
    primaryWorkflow:
      'Cashier identifies the active shift before selling; manager can see who owns every sale sequence.',
    offlineContract:
      'Shift identity is cached locally and attached to receipts and sync payloads when present.',
    dataFeeds: ['Cached users', 'Branch identity', 'Device install id', 'Receipt namespace'],
    actions: [
      { label: 'Start shift', status: 'scaffold' },
      { label: 'Switch cashier', status: 'scaffold' },
      { label: 'PIN policy', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Role and PIN rules',
      'Restart during open shift',
      'Receipt number continuity',
    ],
  },
  'mobile.shift_handoff': {
    surface: 'mobile.shift_handoff',
    scaffoldPhase: '0.7',
    headline: 'End-of-shift cash and variance handoff',
    primaryWorkflow:
      'Outgoing cashier counts cash, records expected vs actual totals, and hands the lane to the next cashier.',
    offlineContract:
      'Handoff writes are local-first and sync as immutable audit events once the device reconnects.',
    dataFeeds: ['Local sales totals', 'Payment mix', 'Open shift', 'Audit log queue'],
    actions: [
      { label: 'Count drawer', status: 'scaffold' },
      { label: 'Record variance', status: 'scaffold' },
      { label: 'Sign handoff', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Variance reason enums',
      'Manager confirmation',
      'End-of-day report integration',
    ],
  },
  'mobile.convenience_counter': {
    surface: 'mobile.convenience_counter',
    scaffoldPhase: '0.7',
    headline: 'Convenience-store shelf and cooler counter',
    primaryWorkflow:
      'Cashier works from high-velocity shelves, drinks, cigarettes, and promo groups with faster repeat-item controls.',
    offlineContract:
      'Still uses canonical pieces and delta sync; promo grouping cannot write absolute stock.',
    dataFeeds: ['Categories', 'Promo tags', 'Local catalog', 'Stock warnings'],
    actions: [
      { label: 'Open counter layout', status: 'scaffold' },
      { label: 'Promo groups', status: 'scaffold' },
      { label: 'Age-check prompt', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Promo pricing rules',
      'Fast repeat-item controls',
      'Low-stock shelf warnings',
    ],
  },
  'mobile.manager_phone': {
    surface: 'mobile.manager_phone',
    scaffoldPhase: '0.7',
    headline: 'Manager approvals from phone',
    primaryWorkflow:
      'Manager approves sensitive cashier actions such as voids, shift corrections, and price overrides from a phone.',
    offlineContract:
      'Approvals are cached locally with role, device, and timestamp metadata, then sync as audit events.',
    dataFeeds: ['Auth role', 'Pending approval queue', 'Audit logs', 'Device identity'],
    actions: [
      { label: 'Approval inbox', status: 'scaffold' },
      { label: 'Void approval', status: 'blocked' },
      { label: 'Price override', status: 'phase-0.9' },
    ],
    acceptanceBacklog: ['Manager-only access', 'Biometric/PIN decision', 'Audit payload review'],
  },
  'mobile.supermarket_counter': {
    surface: 'mobile.supermarket_counter',
    scaffoldPhase: '0.8',
    headline: 'Scanner-driven supermarket lane',
    primaryWorkflow:
      'Cashier scans continuous baskets, handles high line-item counts, and keeps totals visible during long transactions.',
    offlineContract:
      'Every scanned item writes through the shared cart and checkout path; no lane-specific stock math is allowed.',
    dataFeeds: ['Barcode lookup', 'Cart store', 'Payment mix', 'Weighted PLU lookup'],
    actions: [
      { label: 'Open lane shell', status: 'scaffold' },
      { label: 'Continuous scan mode', status: 'blocked' },
      { label: 'Loyalty lookup', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      '100-line cart performance',
      'Scanner focus recovery',
      'Receipt reprint and void path',
    ],
  },
  'mobile.customer_display': {
    surface: 'mobile.customer_display',
    scaffoldPhase: '0.8',
    headline: 'Customer-facing cart display',
    primaryWorkflow:
      'A paired display shows line items, discounts, subtotal, total, and payment status to the customer.',
    offlineContract:
      'Mirrors local cart state only; paired display must not become a second source of transaction truth.',
    dataFeeds: ['Cart store', 'Payment status', 'Store branding', 'Receipt footer'],
    actions: [
      { label: 'Pair display', status: 'scaffold' },
      { label: 'Show live cart', status: 'scaffold' },
      { label: 'Idle branding', status: 'phase-0.9' },
    ],
    acceptanceBacklog: ['Pairing and reconnect rules', 'No customer PII', 'Landscape display QA'],
  },
  'mobile.backoffice_audit': {
    surface: 'mobile.backoffice_audit',
    scaffoldPhase: '0.8',
    headline: 'Back-office audit and exception review',
    primaryWorkflow:
      'Owner reviews voids, stock adjustments, price changes, and sync exceptions from a manager-only device.',
    offlineContract:
      'Reads cached audit and sync health locally; remote complete history requires a synced Supabase session.',
    dataFeeds: ['Audit logs', 'Sync health', 'Inventory logs', 'User roles'],
    actions: [
      { label: 'Open audit queue', status: 'scaffold' },
      { label: 'Review exception', status: 'scaffold' },
      { label: 'Export audit slice', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Immutable audit proof',
      'Keys-only privacy display',
      'Manager/owner route guard',
    ],
  },
  'mobile.weighted_plu': {
    surface: 'mobile.weighted_plu',
    scaffoldPhase: '0.8',
    headline: 'Weighted produce and PLU flow',
    primaryWorkflow:
      'Cashier selects or scans a PLU, captures weight, and converts it into canonical pieces or grams per configured product.',
    offlineContract:
      'Weight capture must produce deterministic local sale_items and inventory deltas; scale network is optional.',
    dataFeeds: ['PLU catalog', 'Scale reading', 'Product unit rules', 'Inventory deltas'],
    actions: [
      { label: 'PLU lookup', status: 'scaffold' },
      { label: 'Scale input', status: 'blocked' },
      { label: 'Manual weight fallback', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Scale hardware decision',
      'Rounding and tare rules',
      'Weighted receipt copy review',
    ],
  },
  'mobile.hq_rollup': {
    surface: 'mobile.hq_rollup',
    scaffoldPhase: '0.8',
    headline: 'HQ rollup for chain operators',
    primaryWorkflow:
      'HQ user sees branch health, sales, stock risk, and sync exceptions across many stores.',
    offlineContract:
      'HQ is primarily synced/remote; device cache can show last-known branch snapshots when offline.',
    dataFeeds: ['Branch summaries', 'Sync health', 'Top products', 'Low-stock risk'],
    actions: [
      { label: 'Open branch map', status: 'scaffold' },
      { label: 'Compare branches', status: 'scaffold' },
      { label: 'Cross-branch transfer', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Enterprise role model',
      'Cross-tenant isolation proof',
      'Branch snapshot cache',
    ],
  },
  'mobile.self_service_kiosk': {
    surface: 'mobile.self_service_kiosk',
    scaffoldPhase: '0.8',
    headline: 'Locked-down customer kiosk',
    primaryWorkflow:
      'Customer browses a limited catalog, builds an order, and hands off payment or pickup to staff.',
    offlineContract:
      'Kiosk orders queue locally and require staff confirmation before stock is decremented.',
    dataFeeds: ['Public catalog subset', 'Kiosk cart', 'Staff approval queue', 'Device lock state'],
    actions: [
      { label: 'Start kiosk mode', status: 'scaffold' },
      { label: 'Staff handoff', status: 'scaffold' },
      { label: 'Device lock policy', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Escape/lockdown policy',
      'Staff confirmation guard',
      'Customer accessibility pass',
    ],
  },
  'mobile.returns_warranty': {
    surface: 'mobile.returns_warranty',
    scaffoldPhase: '0.8',
    headline: 'Returns and warranty desk',
    primaryWorkflow:
      'Staff looks up a receipt, records return reason, and creates compensating inventory/payment entries.',
    offlineContract:
      'Never mutates the original sale. Every return or warranty outcome writes compensating rows with new operation IDs.',
    dataFeeds: ['Receipt lookup', 'Sale items', 'Inventory logs', 'Manager approvals'],
    actions: [
      { label: 'Lookup receipt', status: 'scaffold' },
      { label: 'Record return reason', status: 'scaffold' },
      { label: 'Warranty claim', status: 'phase-0.9' },
    ],
    acceptanceBacklog: [
      'Compensating-sale schema',
      'Manager approval rule',
      'Receipt reference formatting',
    ],
  },
}

export function getMobileSurfaceScaffold(surface: TierSurface): SurfaceScaffold | null {
  return MOBILE_SURFACE_SCAFFOLDS[surface as MobileTierSurface] ?? null
}
