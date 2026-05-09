// @tdpos/shared — Constants

export const APP_NAME = 'TD POS'
export const APP_TAGLINE = 'Tama ang stock mo. Lagi.'
export const SPEC_VERSION = '5.0'

// Free tier limits
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
