---
name: zustand-mmkv-stores
description: Use this skill when creating state stores, persisting data, or managing client-side state. Agents commonly hallucinate Redux, MobX, or AsyncStorage patterns. TD POS uses Zustand 5 with MMKV persistence.
version: 1.0.0
---

# Zustand 5 + MMKV Store Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate Redux boilerplate (`createSlice`, `configureStore`, `useDispatch`), MobX observables, or use `AsyncStorage` for persistence. **TD POS uses Zustand 5 + MMKV exclusively.**

## MMKV Storage Adapter (create once, reuse everywhere)

```typescript
// src/services/storage.ts
import { createMMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'

export const storage = createMMKV()

export const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
}
```

## Store Pattern: Auth Store

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStorage } from '@/services/storage'

interface AuthState {
  userId: string | null
  businessId: string | null
  role: string | null
  branchCode: string | null
  cashierCode: string | null
  setAuth: (user: { userId: string; businessId: string; role: string }) => void
  setDevice: (branchCode: string, cashierCode: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      businessId: null,
      role: null,
      branchCode: null,
      cashierCode: null,
      setAuth: (user) => set({
        userId: user.userId,
        businessId: user.businessId,
        role: user.role,
      }),
      setDevice: (branchCode, cashierCode) => set({ branchCode, cashierCode }),
      clearAuth: () => set({
        userId: null,
        businessId: null,
        role: null,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)
```

## Store Pattern: Settings Store (Module Toggles)

```typescript
// src/stores/settings-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStorage } from '@/services/storage'
import { DEFAULT_MODULE_STATE } from '@tdpos/shared'

interface SettingsState {
  modules: typeof DEFAULT_MODULE_STATE
  toggleModule: (name: keyof typeof DEFAULT_MODULE_STATE) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      modules: { ...DEFAULT_MODULE_STATE }, // All OFF by default
      toggleModule: (name) => set((state) => ({
        modules: { ...state.modules, [name]: !state.modules[name] },
      })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ modules: state.modules }), // Only persist modules
    }
  )
)
```

## Rules

- **One store per domain:** `auth-store.ts`, `cart-store.ts`, `settings-store.ts`, `sync-store.ts`
- **Persist only what matters:** Use `partialize` to exclude ephemeral UI state
- **No classes:** Functional patterns only, no MobX-style classes
- **MMKV not AsyncStorage:** MMKV is synchronous = no hydration flash
- **useShallow for multi-value selectors:** Zustand 5 causes infinite re-renders if a selector returns a new reference each time

## Zustand 5 Breaking Changes (from v4)

```typescript
// ⚠️ v5: Selecting multiple values — MUST use useShallow
import { useShallow } from 'zustand/shallow'

// ❌ WRONG in v5 — creates new object reference each render → infinite loop
const { userId, role } = useAuthStore((s) => ({ userId: s.userId, role: s.role }))

// ✅ CORRECT in v5 — useShallow prevents infinite re-renders
const { userId, role } = useAuthStore(
  useShallow((s) => ({ userId: s.userId, role: s.role }))
)

// ✅ ALSO CORRECT — select a single primitive value (no useShallow needed)
const userId = useAuthStore((s) => s.userId)
```

**Other v5 changes:**
- `persist` no longer auto-stores initial state on creation
- `create()` no longer accepts custom equality fn as 2nd arg — use `createWithEqualityFn` from `zustand/traditional`

## ❌ DO NOT USE

```tsx
// ❌ Redux
import { configureStore, createSlice } from '@reduxjs/toolkit'
import { Provider, useDispatch, useSelector } from 'react-redux'

// ❌ AsyncStorage for Zustand
import AsyncStorage from '@react-native-async-storage/async-storage'
storage: createJSONStorage(() => AsyncStorage) // Too slow, async hydration

// ❌ v4 multi-select pattern (breaks in v5)
const { a, b } = useStore((s) => ({ a: s.a, b: s.b }))

// ✅ MMKV for Zustand
import { mmkvStorage } from '@/services/storage'
storage: createJSONStorage(() => mmkvStorage)

// ✅ v5 multi-select with useShallow
import { useShallow } from 'zustand/shallow'
const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })))
```

## Sources

- Packages: `zustand@^5.0.13`, `react-native-mmkv@^4.3.1` (verified against `apps/mobile/package.json`)
- Zustand docs: <https://zustand.docs.pmnd.rs/>
- Zustand v5 migration notes: <https://zustand.docs.pmnd.rs/migrations/migrating-to-v5>
- `useShallow` reference: <https://zustand.docs.pmnd.rs/hooks/use-shallow>
- MMKV docs: <https://github.com/mrousavy/react-native-mmkv>
- Implementation: `apps/mobile/src/services/storage.ts`, `apps/mobile/src/stores/auth-store.ts`, `apps/mobile/src/stores/cart-store.ts`, `apps/mobile/src/stores/settings-store.ts`
- Last verified: 2026-05-09
