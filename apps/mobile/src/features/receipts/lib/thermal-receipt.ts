import {
  APP_BRANDING_FOOTER,
  BIR_RECEIPT_FOOTER,
  BIR_RECEIPT_HEADER,
  BIR_RECEIPT_NOTE,
  type PaymentMethod,
  type SoldAs,
} from '@tdpos/shared'

const PAPER_WIDTH = 32
const MONEY_WIDTH = 11

export interface ThermalReceiptItem {
  name: string
  qty: number
  wasSoldAs: SoldAs
  unitPrice: number
  lineTotal: number
}

export interface ThermalReceiptInput {
  storeName: string
  storeAddress: string
  tin: string
  receiptNumber: string
  status?: 'completed' | 'voided'
  voidedOriginalReceiptNumber?: string | null
  total: number
  tendered: number
  change: number
  paymentMethod: PaymentMethod
  isUtang: boolean
  items: ThermalReceiptItem[]
  createdAt: number
}

export function formatThermalReceipt(input: ThermalReceiptInput): string {
  const isVoid = input.status === 'voided'
  const isCash = input.paymentMethod === 'cash' && !input.isUtang && !isVoid
  const lines = [
    center(BIR_RECEIPT_HEADER),
    center(input.storeName || 'TD POS Store'),
    ...(input.storeAddress ? [center(input.storeAddress)] : []),
    ...(input.tin ? [center(`TIN: ${input.tin}`)] : []),
    rule(),
    'Receipt:',
    center(input.receiptNumber),
    ...(isVoid && input.voidedOriginalReceiptNumber
      ? ['VOID of:', center(input.voidedOriginalReceiptNumber)]
      : []),
    `Date: ${formatLocalDateTime(input.createdAt)}`,
    rule(),
    ...input.items.flatMap((item) => [
      leftRight(
        `${item.qty}x ${item.name}${item.wasSoldAs === 'pack' ? ' (pack)' : ''}`,
        formatThermalMoney(item.lineTotal),
      ),
      `  ${formatThermalMoney(item.unitPrice)}/${item.wasSoldAs === 'pack' ? 'pack' : 'pc'}`,
    ]),
    rule(),
    leftRight('TOTAL', formatThermalMoney(input.total)),
  ]

  if (isVoid) {
    lines.push(leftRight('VOID', formatThermalMoney(input.total)))
  } else if (input.isUtang) {
    lines.push(leftRight('UTANG', formatThermalMoney(input.total)))
  } else if (isCash) {
    lines.push(leftRight('CASH', formatThermalMoney(input.tendered)))
    lines.push(leftRight('CHANGE', formatThermalMoney(input.change)))
  } else {
    lines.push(leftRight(input.paymentMethod.toUpperCase(), formatThermalMoney(input.total)))
  }

  lines.push(
    rule(),
    center(BIR_RECEIPT_FOOTER),
    ...wrapCentered(BIR_RECEIPT_NOTE),
    center(APP_BRANDING_FOOTER),
    '',
    '',
  )

  return `${lines.flat().join('\n')}\n`
}

export function formatThermalMoney(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}PHP ${Math.abs(value).toFixed(2)}`
}

function center(value: string): string {
  const clean = stripLineBreaks(value).slice(0, PAPER_WIDTH)
  const left = Math.max(0, Math.floor((PAPER_WIDTH - clean.length) / 2))
  return `${' '.repeat(left)}${clean}`
}

function wrapCentered(value: string): string[] {
  const words = stripLineBreaks(value).split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > PAPER_WIDTH && current) {
      lines.push(center(current))
      current = word
    } else {
      current = candidate
    }
  }

  if (current) lines.push(center(current))
  return lines
}

function leftRight(left: string, right: string): string {
  const cleanRight = stripLineBreaks(right).slice(0, MONEY_WIDTH)
  const maxLeft = PAPER_WIDTH - cleanRight.length - 1
  const cleanLeft = stripLineBreaks(left).slice(0, Math.max(1, maxLeft))
  const gap = Math.max(1, PAPER_WIDTH - cleanLeft.length - cleanRight.length)
  return `${cleanLeft}${' '.repeat(gap)}${cleanRight}`
}

function rule(): string {
  return '='.repeat(PAPER_WIDTH)
}

function stripLineBreaks(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function formatLocalDateTime(value: number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const yyyy = date.getFullYear().toString().padStart(4, '0')
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  const hh = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const ss = date.getSeconds().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}
