---
name: react-19-patterns
description: Use this skill when writing React components, hooks, state/effect logic, memoization, React 19 APIs, or shared UI patterns for TD POS mobile and web. TD POS uses React 19.2 via Expo SDK 55 / React Native 0.83 and will use React through Next.js 16 on the web dashboard.
version: 1.0.0
verified: 2026-05-09
sources:
  - https://react.dev/blog/2025/10/01/react-19-2
  - https://react.dev/reference/react/hooks
  - https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks
  - https://docs.expo.dev/versions/latest/
  - https://docs.expo.dev/guides/new-architecture/
---

# React 19 Patterns — TD POS

## Project Version

TD POS uses React in both major surfaces:

- **Mobile:** Expo SDK 55 → React Native 0.83 → React 19.2
- **Web dashboard:** Next.js 16 → React 19.x

Expo SDK 55 pins the React Native/React relationship. Do not manually jump React or React Native ahead of the Expo SDK target unless Expo’s compatibility docs and `expo-doctor` say it is safe.

## Core Rules

- Use function components only.
- Use Hooks at the top level of components or custom hooks.
- Do not call Hooks inside conditions, loops, callbacks, async functions, class methods, or module scope.
- Use custom hooks for reusable behavior, not renderless class/service components.
- Keep rendering pure: no SQLite writes, network calls, navigation mutations, haptics, sounds, or store writes during render.
- Event handlers may trigger writes, haptics, sounds, and navigation.
- Effects are for synchronizing with external systems, not for deriving render data.
- Prefer deriving values during render with plain variables.
- Use `useMemo` only for expensive calculations or stable references required by optimized children.
- Use `useCallback` only when a stable callback identity matters.
- Do not use Redux, MobX, or React Context as the primary app store. TD POS uses Zustand + MMKV.
- Do not use React Query mutations for offline sales. Local SQLite + `sync_queue` owns offline writes.

## React Native / Expo Constraints

- React Native screens must use React Native primitives (`View`, `Text`, `Pressable`, etc.) or React Native Paper components.
- Do not use DOM elements (`div`, `span`, `button`) in `apps/mobile`.
- Do not use browser-only APIs in mobile components unless guarded by platform checks.
- Do not use React DOM form Actions in mobile screens.
- Expo SDK 55 uses the React Native New Architecture; do not add `newArchEnabled: false`.
- Validate native dependencies with `expo-doctor` before production builds.

## State Ownership

| Concern                                | Owner                              |
| -------------------------------------- | ---------------------------------- |
| Auth/session/device identity           | Zustand + MMKV                     |
| Cart/payment UI state                  | Zustand + MMKV                     |
| Settings/module toggles/language/theme | Zustand + MMKV                     |
| Product/report reads from local SQLite | TanStack React Query v5            |
| Offline writes/sales/inventory deltas  | SQLite transactions + `sync_queue` |
| Remote sync retry state                | SQLite `sync_queue`                |
| Pure visual component local state      | React `useState` / `useReducer`    |

## Component Pattern

```tsx
import { View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'

interface EmptyStateProps {
  title: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, actionLabel, onAction }: EmptyStateProps) {
  const theme = useAppTheme()

  return (
    <View style={{ gap: 12, padding: 16, backgroundColor: theme.colors.surface }}>
      <Text variant="titleMedium">{title}</Text>
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  )
}
```

## Custom Hook Pattern

```tsx
import { useMemo } from 'react'

import { piecesForSaleUnit } from '@tdpos/shared'
import type { CartItem } from '@/stores/cart-store'

export function useCartTotals(items: CartItem[]) {
  return useMemo(() => {
    return items.reduce(
      (totals, item) => {
        totals.lineCount += 1
        totals.total += item.lineTotal
        totals.pieceCount += piecesForSaleUnit(item.qty, item.wasSoldAs, item.piecesPerPack)
        return totals
      },
      { lineCount: 0, pieceCount: 0, total: 0 },
    )
  }, [items])
}
```

Use `useMemo` here because cart totals can be shared by multiple child components and the logic is meaningful domain math. Do not wrap every simple expression in `useMemo`.

## Effects

Use `useEffect` when connecting to something outside React:

- Supabase auth state listener
- AppState foreground sync trigger
- Audio preload/cleanup
- Background task registration
- Timer cleanup
- Imperative native APIs

Do not use effects for simple derivations:

```tsx
// Wrong: derived state via effect
const [total, setTotal] = useState(0)
useEffect(() => {
  setTotal(items.reduce((sum, item) => sum + item.lineTotal, 0))
}, [items])

// Correct: derive during render
const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
```

## Transitions

Use `useTransition` for non-urgent UI updates, such as switching filters on a large list or preparing a report view. Do not use a transition to hide durability-critical sale writes.

```tsx
import { useTransition } from 'react'

function CategoryFilter({ onSelect }: { onSelect: (id: string) => void }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Chip
      disabled={isPending}
      onPress={() => {
        startTransition(() => {
          onSelect('sachet')
        })
      }}
    >
      Sachet
    </Chip>
  )
}
```

Checkout is different: write to SQLite first, then show success only after the transaction commits.

## React 19 Actions APIs

React 19 includes action-oriented APIs such as `useActionState` and `useOptimistic`. Use them carefully:

- Good fit for web dashboard forms and server actions.
- Possible fit for temporary optimistic UI that can be rolled back.
- Not a replacement for TD POS offline writes.
- Not a replacement for `client_operation_id`.
- Not a replacement for SQLite transactions.
- Not a replacement for `sync_queue`.

For mobile cashier flows, prefer explicit event handlers that call local services/stores:

```tsx
async function confirmSale() {
  const result = await createOfflineSale(db, cart)
  setLastSaleResult(result)
  clearCart()
  router.replace('/receipt')
}
```

## Memoization

React Compiler can reduce the need for manual memoization when it is enabled in a toolchain. TD POS should not assume it is enabled.

Use manual memoization only when:

- A calculated value is expensive.
- A child component is memoized and receives object/function props.
- A hook dependency needs a stable value.
- A list item renderer would otherwise churn.

Avoid blanket `memo`, `useMemo`, and `useCallback`. They make POS code harder to read when there is no measured problem.

## Lists

- Use FlashList for large product/inventory lists.
- With FlashList v2, do not use removed `estimatedItemSize`.
- Keep row/item components pure.
- Use stable IDs as keys.
- Avoid inline heavy calculations inside item renderers.
- Keep product image loading in `expo-image`.

## Error Boundaries

React error boundaries catch render errors but not every async/event error. Add route-level or app-level boundaries when the UI surface is ready, but still handle operational errors explicitly:

- SQLite transaction failures
- Sync failures
- Printer failures
- Camera permission denial
- Supabase auth errors

Operational errors should be visible and recoverable, not only logged.

## Suspense

Use Suspense only after the data source supports it cleanly. Current TD POS foundation uses React Query loading states and SQLite async calls directly. Do not introduce Suspense for core cashier flows until the behavior is tested on Expo SDK 55 development builds.

## Server Components

React Server Components and server actions are web/Next.js concerns. Do not use them in `apps/mobile`.

For the future `apps/web` dashboard:

- Keep server-only code in server components/actions.
- Keep browser interactions in client components.
- Use Supabase SSR `getClaims()` for auth.
- Do not import mobile-only packages into web components.

## Anti-Patterns

```tsx
// Wrong: side effect during render
if (cart.length === 0) {
  router.replace('/')
}

// Correct: event or effect with a clear synchronization reason
useEffect(() => {
  if (cart.length === 0 && shouldLeaveCheckout) {
    router.replace('/')
  }
}, [cart.length, shouldLeaveCheckout])
```

```tsx
// Wrong: Hook after early return
if (!product) return null
const theme = useAppTheme()

// Correct
const theme = useAppTheme()
if (!product) return null
```

```tsx
// Wrong: DOM in mobile
return <div>Sale</div>

// Correct
return <Text>Sale</Text>
```

## Checklist Before Merging React Code

- [ ] Hooks are top-level and unconditional.
- [ ] Render functions are pure.
- [ ] No DOM elements in mobile code.
- [ ] No browser-only APIs in mobile code.
- [ ] No React Navigation APIs; use Expo Router.
- [ ] Zustand selectors that return multiple values use `useShallow`.
- [ ] React Query uses v5 object syntax and `gcTime`.
- [ ] Offline writes go through SQLite transactions.
- [ ] Success UI appears only after durable local writes.
- [ ] List renderers are stable enough for low-end Android devices.
- [ ] User-facing strings are ready for i18n if part of cashier flow.
- [ ] Accessibility labels exist for interactive controls.

## Sources

- Packages: mobile `react@19.2.0`, mobile `react-native@0.83.6`, web `react@19.2.6`, web `react-dom@19.2.6` (verified against `apps/mobile/package.json` and `apps/web/package.json`)
- React 19 release: <https://react.dev/blog/2025/10/01/react-19-2>
- Hooks reference: <https://react.dev/reference/react/hooks>
- Rules of Hooks lint reference: <https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks>
- Expo SDK 55 docs: <https://docs.expo.dev/versions/v55.0.0/>
- New Architecture overview: <https://docs.expo.dev/guides/new-architecture/>
- React Native 0.83 release notes: <https://reactnative.dev/blog>
- Implementation: every component in `apps/mobile/`; lint enforced by `eslint-plugin-react-hooks` in `eslint.config.mjs`.
- Last verified: 2026-05-09
