import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { mmkvStorage } from '@/services/storage'
import type { UserRole } from '@tdpos/shared'

interface AuthUserInput {
  userId: string
  businessId: string
  role: UserRole
  phone?: string | null
}

interface DeviceInput {
  branchId: string
  branchCode: string
  branchName: string
  cashierCode: string
  storeName?: string | null
  storeAddress?: string | null
  tin?: string | null
}

interface AuthState {
  userId: string | null
  businessId: string | null
  role: UserRole | null
  phone: string | null
  branchId: string | null
  branchCode: string | null
  branchName: string | null
  cashierCode: string | null
  storeName: string | null
  storeAddress: string | null
  tin: string | null
  setAuth: (user: AuthUserInput) => void
  setDevice: (device: DeviceInput) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      businessId: null,
      role: null,
      phone: null,
      branchId: null,
      branchCode: null,
      branchName: null,
      cashierCode: null,
      storeName: null,
      storeAddress: null,
      tin: null,
      setAuth: ({ userId, businessId, role, phone = null }) =>
        set({ userId, businessId, role, phone }),
      setDevice: ({
        branchId,
        branchCode,
        branchName,
        cashierCode,
        storeName = null,
        storeAddress = null,
        tin = null,
      }) =>
        set({
          branchId,
          branchCode,
          branchName,
          cashierCode,
          storeName,
          storeAddress,
          tin,
        }),
      clearAuth: () =>
        set({
          userId: null,
          businessId: null,
          role: null,
          phone: null,
          branchId: null,
          branchCode: null,
          branchName: null,
          cashierCode: null,
          storeName: null,
          storeAddress: null,
          tin: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
)
