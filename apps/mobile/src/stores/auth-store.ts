import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { BootstrapOutcome } from '@/services/auth-bootstrap'
import { mmkvStorage } from '@/services/storage'
import {
  TIER_A_FREE,
  getTierModuleState,
  type ModuleName,
  type SubscriptionTier,
  type UserRole,
} from '@tdpos/shared'

type ModuleState = Record<ModuleName, boolean>

interface AuthUserInput {
  userId: string
  businessId: string
  role: UserRole
  phone?: string | null
  subscriptionTier?: SubscriptionTier
  modules?: ModuleState
  entitlementsValidUntil?: string | null
}

interface EntitlementsInput {
  subscriptionTier: SubscriptionTier
  modules: ModuleState
  entitlementsValidUntil?: string | null
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
  // Tier fields — populated by `bootstrapAuthFromSession` from the
  // `businesses` row, defaulted to tier_a_free when absent. Persisted so
  // an offline cold start can render the right surfaces immediately;
  // the listener re-evaluates on every INITIAL_SESSION so stale entries
  // are corrected the next time the device is online.
  subscriptionTier: SubscriptionTier
  modules: ModuleState
  entitlementsValidUntil: string | null
  // Ephemeral. Tracks the most recent auth-bootstrap result so (auth) screens
  // can render `account_not_provisioned` / `no_branches_configured` etc.
  // Excluded from MMKV persist via partialize — re-evaluated each session.
  bootstrapStatus: BootstrapOutcome | null
  setAuth: (user: AuthUserInput) => void
  setEntitlements: (entitlements: EntitlementsInput) => void
  setDevice: (device: DeviceInput) => void
  setBootstrapStatus: (status: BootstrapOutcome | null) => void
  clearAuth: () => void
}

const TIER_A_DEFAULT_MODULES: ModuleState = getTierModuleState(TIER_A_FREE)

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
      subscriptionTier: TIER_A_FREE,
      modules: TIER_A_DEFAULT_MODULES,
      entitlementsValidUntil: null,
      bootstrapStatus: null,
      setAuth: ({
        userId,
        businessId,
        role,
        phone = null,
        subscriptionTier = TIER_A_FREE,
        modules = TIER_A_DEFAULT_MODULES,
        entitlementsValidUntil = null,
      }) =>
        set({
          userId,
          businessId,
          role,
          phone,
          subscriptionTier,
          modules,
          entitlementsValidUntil,
        }),
      setEntitlements: ({ subscriptionTier, modules, entitlementsValidUntil = null }) =>
        set({
          subscriptionTier,
          modules,
          entitlementsValidUntil,
        }),
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
      setBootstrapStatus: (status) => set({ bootstrapStatus: status }),
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
          subscriptionTier: TIER_A_FREE,
          modules: TIER_A_DEFAULT_MODULES,
          entitlementsValidUntil: null,
          bootstrapStatus: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      // Persist identity facts + tier-derived entitlements. bootstrapStatus is
      // session-scoped — the listener re-fires INITIAL_SESSION and
      // re-evaluates on every cold start.
      partialize: (state) => ({
        userId: state.userId,
        businessId: state.businessId,
        role: state.role,
        phone: state.phone,
        branchId: state.branchId,
        branchCode: state.branchCode,
        branchName: state.branchName,
        cashierCode: state.cashierCode,
        storeName: state.storeName,
        storeAddress: state.storeAddress,
        tin: state.tin,
        subscriptionTier: state.subscriptionTier,
        modules: state.modules,
        entitlementsValidUntil: state.entitlementsValidUntil,
      }),
    },
  ),
)
