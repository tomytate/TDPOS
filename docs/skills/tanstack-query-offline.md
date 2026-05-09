---
name: tanstack-query-offline
description: Use this skill when implementing data fetching, caching, optimistic updates, or offline mutation queuing. Agents commonly hallucinate React Query v3 patterns or SWR. TD POS uses TanStack React Query v5 with offline-first patterns.
version: 1.0.0
---

# TanStack React Query 5 — Offline-First Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate React Query v3 patterns (`useQuery({ queryKey, queryFn })` is correct, but `onSuccess` callback on `useQuery` was REMOVED in v5). They may also confuse the roles of Zustand vs React Query in our architecture.

## Architecture: Zustand vs React Query

| Concern | Tool | Why |
|---|---|---|
| **Client state** (auth, settings, cart, UI) | Zustand + MMKV | Synchronous, persisted, no server involved |
| **Server state** (products list, reports, sync status) | TanStack Query | Caching, background refetch, stale-while-revalidate |
| **Offline writes** (sales, inventory deltas) | SQLite sync_queue | Our custom sync engine handles this, NOT React Query mutations |

## QueryClient Setup

```typescript
// src/services/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes (was cacheTime in v4)
      retry: 2,
      refetchOnWindowFocus: false, // Not relevant for mobile
    },
  },
})
```

## Network Awareness (React Native)

```typescript
// src/services/network.ts
import { onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'

// Tell React Query about network state
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

## Fetching Pattern: Products from SQLite

```typescript
// src/features/products/hooks/use-products.ts
import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

export function useProducts() {
  const db = useSQLiteContext()

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return db.getAllAsync<Product>(
        'SELECT * FROM products WHERE is_active = 1 ORDER BY name'
      )
    },
    // v5: NO onSuccess/onError callbacks on useQuery
    // Use useEffect to handle side effects if needed
  })
}
```

## Optimistic Update Pattern (for non-sync operations)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateProductName() {
  const queryClient = useQueryClient()
  const db = useSQLiteContext()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await db.runAsync('UPDATE products SET name = ? WHERE id = ?', [name, id])
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const previous = queryClient.getQueryData(['products'])
      queryClient.setQueryData(['products'], (old: Product[]) =>
        old.map((p) => (p.id === id ? { ...p, name } : p))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['products'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

## v5 Breaking Changes from v3/v4

| v3/v4 ❌ | v5 ✅ |
|---|---|
| `cacheTime` | `gcTime` |
| `useQuery({ onSuccess })` | Removed — use `useEffect` |
| `useQuery({ onError })` | Removed — use `error` return value |
| `useQuery(key, fn, options)` | `useQuery({ queryKey, queryFn, ...options })` |
| `status: 'loading'` | `status: 'pending'` |
| `isLoading` (first load only) | `isPending` (any pending state) |
| `isInitialLoading` | `isLoading` (renamed: `isPending && isFetching`) |
| `keepPreviousData: true` | `placeholderData: (prev) => prev` |
| Infinite query without `initialPageParam` | `initialPageParam` is REQUIRED |

## ❌ DO NOT USE

```tsx
// ❌ v3/v4 patterns
useQuery(['products'], fetchProducts, { onSuccess: (data) => {} })
useQuery({ queryKey: ['x'], cacheTime: 5000 })

// ❌ SWR
import useSWR from 'swr'

// ❌ Using React Query for offline sales (use sync_queue instead)
useMutation({ mutationFn: submitSaleToServer })

// ✅ v5 pattern
useQuery({ queryKey: ['products'], queryFn: fetchProducts, gcTime: 5000 })
```

## Sources

- Package: `@tanstack/react-query@^5.100.9` (verified against `apps/mobile/package.json`)
- Official docs: <https://tanstack.com/query/v5/docs>
- v5 migration guide: <https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5>
- React Native + onlineManager: <https://tanstack.com/query/v5/docs/framework/react/react-native>
- Implementation: `apps/mobile/src/services/query-client.ts`, `apps/mobile/src/features/products/hooks/use-products.ts`, `apps/mobile/src/features/products/hooks/use-categories.ts`, `apps/mobile/src/features/reports/hooks/use-daily-sales.ts`
- Last verified: 2026-05-09
