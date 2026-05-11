// Cart store — Zustand 5 (ephemeral, no persistence).
// Manages current transaction items, totals, tender, and change.
// Cleared on checkout completion or explicit discard.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { mmkvStorage } from '@/services/storage'
import type { PaymentMethod, SoldAs } from '@tdpos/shared'

export interface CartProductInput {
  id: string
  name: string
  price_per_piece: number
  price_per_pack: number | null
  pieces_per_pack: number
  category_id: string | null
  image_uri?: string | null
}

export interface CartItem {
  productId: string
  name: string
  qty: number
  unitPrice: number
  wasSoldAs: SoldAs
  piecesPerPack: number
  categoryId: string | null
  imageUri: string | null
  lineTotal: number
}

export interface LastSaleResultItem {
  name: string
  qty: number
  wasSoldAs: SoldAs
  unitPrice: number
  lineTotal: number
}

export interface LastSaleResult {
  saleId: string
  receiptNumber: string
  total: number
  tendered: number
  change: number
  paymentMethod: PaymentMethod
  isUtang: boolean
  items: LastSaleResultItem[]
  createdAt: number
}

interface CartState {
  items: CartItem[]
  paymentMethod: PaymentMethod | null
  tendered: number
  lastSaleResult: LastSaleResult | null
  addItem: (product: CartProductInput, wasSoldAs?: SoldAs, qty?: number) => void
  removeItem: (productId: string, wasSoldAs?: SoldAs) => void
  updateQty: (productId: string, qty: number, wasSoldAs?: SoldAs) => void
  setPaymentMethod: (paymentMethod: PaymentMethod | null) => void
  setTendered: (tendered: number) => void
  setLastSaleResult: (result: LastSaleResult | null) => void
  clear: () => void
}

const getUnitPrice = (product: CartProductInput, wasSoldAs: SoldAs) => {
  if (wasSoldAs === 'pack' && product.price_per_pack !== null) {
    return product.price_per_pack
  }

  return product.price_per_piece
}

const withLineTotal = (item: Omit<CartItem, 'lineTotal'>): CartItem => ({
  ...item,
  lineTotal: item.qty * item.unitPrice,
})

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      paymentMethod: null,
      tendered: 0,
      lastSaleResult: null,
      addItem: (product, wasSoldAs = 'piece', qty = 1) =>
        set((state) => {
          const unitPrice = getUnitPrice(product, wasSoldAs)
          const existing = state.items.find(
            (item) => item.productId === product.id && item.wasSoldAs === wasSoldAs,
          )

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id && item.wasSoldAs === wasSoldAs
                  ? withLineTotal({ ...item, qty: item.qty + qty })
                  : item,
              ),
            }
          }

          return {
            items: [
              ...state.items,
              withLineTotal({
                productId: product.id,
                name: product.name,
                qty,
                unitPrice,
                wasSoldAs,
                piecesPerPack: product.pieces_per_pack,
                categoryId: product.category_id,
                imageUri: product.image_uri ?? null,
              }),
            ],
          }
        }),
      removeItem: (productId, wasSoldAs) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              item.productId !== productId ||
              (wasSoldAs !== undefined && item.wasSoldAs !== wasSoldAs),
          ),
        })),
      updateQty: (productId, qty, wasSoldAs) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            const matches =
              item.productId === productId &&
              (wasSoldAs === undefined || item.wasSoldAs === wasSoldAs)

            if (!matches) return [item]
            if (qty <= 0) return []

            return [withLineTotal({ ...item, qty })]
          }),
        })),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setTendered: (tendered) => set({ tendered }),
      setLastSaleResult: (lastSaleResult) => set({ lastSaleResult }),
      clear: () => set({ items: [], paymentMethod: null, tendered: 0 }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
