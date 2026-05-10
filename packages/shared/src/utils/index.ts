import { RECEIPT_SEQUENCE_PAD_LENGTH } from '../constants/index'
import type { SoldAs } from '../types/index'

export const formatMoney = (value: number) =>
  `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

// Tier-price renderer with three states: published price, free, and pending.
// Centralized so pricing copy stays consistent across the marketing page,
// dashboard tier pill, and mobile /subscription screen.
export const formatTierPrice = (pricePhpMonthly: number | null) => {
  if (pricePhpMonthly === null) return 'Pricing coming soon'
  if (pricePhpMonthly === 0) return 'Free forever'
  return `₱${pricePhpMonthly.toLocaleString('en-PH')}/month`
}

interface CryptoLike {
  randomUUID?: () => string
  getRandomValues?: (array: Uint8Array) => Uint8Array
}

const getCrypto = (): CryptoLike | undefined => (globalThis as { crypto?: CryptoLike }).crypto

export const createClientOperationId = (): string => {
  const crypto = getCrypto()
  if (crypto?.randomUUID) {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}

export const formatReceiptDate = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export const splitStock = (stockPieces: number, piecesPerPack: number) => {
  const safePiecesPerPack = Math.max(1, Math.trunc(piecesPerPack))
  const safeStockPieces = Math.max(0, Math.trunc(stockPieces))

  return {
    packs: Math.floor(safeStockPieces / safePiecesPerPack),
    loosePieces: safeStockPieces % safePiecesPerPack,
  }
}

export const displayStock = (stockPieces: number, piecesPerPack: number, unitLabel = 'piece') => {
  const { packs, loosePieces } = splitStock(stockPieces, piecesPerPack)
  const packLabel = packs === 1 ? 'pack' : 'packs'
  const pieceLabel = loosePieces === 1 ? unitLabel : `${unitLabel}s`

  return `${packs} ${packLabel} + ${loosePieces} ${pieceLabel}`
}

export const piecesForSaleUnit = (qty: number, wasSoldAs: SoldAs, piecesPerPack: number) => {
  const safeQty = Math.max(0, Math.trunc(qty))
  const safePiecesPerPack = Math.max(1, Math.trunc(piecesPerPack))

  return wasSoldAs === 'pack' ? safeQty * safePiecesPerPack : safeQty
}

export const generateReceiptNumber = (
  branchCode: string,
  cashierCode: string,
  date: string,
  sequence: number,
) => {
  const paddedSequence = String(sequence).padStart(RECEIPT_SEQUENCE_PAD_LENGTH, '0')

  return `${branchCode}-${cashierCode}-${date}-${paddedSequence}`
}

export const isValidReceiptNumber = (receiptNumber: string) =>
  /^[A-Z0-9]{3,5}-[A-Z0-9]{2,5}-\d{8}-\d{6}$/.test(receiptNumber)

export const normalizePhPhone = (input: string) => {
  const compact = input.replace(/[^\d+]/g, '')

  if (compact.startsWith('+63')) return compact
  if (compact.startsWith('63')) return `+${compact}`
  if (compact.startsWith('0')) return `+63${compact.slice(1)}`

  return compact
}

export const isValidPhPhone = (input: string) => /^\+63[89]\d{9}$/.test(normalizePhPhone(input))
