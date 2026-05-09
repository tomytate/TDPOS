---
name: deprecations
description: Single source of truth for "do not use X, use Y" rules across the TD POS stack. CLAUDE.md, AGENTS.md, GEMINI.md, and CODEX.md must reference this file rather than duplicating the table.
version: 1.0.0
last_verified: 2026-05-09
---

# Deprecations And Replacements (Single Source)

This is the canonical deprecations table. Every other agent-facing doc references this page rather than copying the table. The forbidden-patterns scanner (`scripts/check-forbidden-patterns.mjs`) enforces a subset of these rules at the foundation gate.

When adding or changing an entry here:

1. Bump `last_verified` in the frontmatter.
2. Update `scripts/check-forbidden-patterns.mjs` if the new entry is mechanically detectable.
3. Update the relevant skill doc's "Sources" section (DocGate-3).
4. Open a PR; the link integrity check (DocGate-1) and foundation gate must stay green.

## The Table

| ❌ Do NOT use                              | ✅ Use instead                                                | Why |
| ------------------------------------------ | ------------------------------------------------------------- | --- |
| `expo-background-fetch`                    | `expo-background-task` (`defineTask` + `registerTaskAsync`)   | Removed from Expo SDK 53+; SDK 55 ships `expo-background-task`. |
| Legacy Architecture (RN)                   | Fabric (mandatory SDK 55+; `newArchEnabled` flag removed)     | SDK 55 enables Fabric by default; the flag no longer exists. |
| Node 18 / 19 / 20                          | Node 24 LTS                                                   | Expo SDK 55 requires Node 20.19.x minimum, but Node 20 reached EOL on 2026-04-30; project pins Node 24 via `.nvmrc` and `.node-version`. |
| `middleware.ts` (Next.js 15)               | `proxy.ts` with `export function proxy()` (Next.js 16)        | Next.js 16 renamed middleware to proxy. |
| Zod 3 `message:` param                     | Zod 4 unified `error:` param                                  | `message:` is removed in Zod 4. |
| `getSession()` (Supabase SSR)              | `getClaims()` (local JWT validation, faster)                  | `@supabase/ssr` 0.10+ recommends `getClaims()` for SSR. |
| `react-native-thermal-printer-driver`      | `@haroldtran/react-native-thermal-printer`                    | The first package name does not exist on npm. The second is the verified Fabric-compatible printer. |
| `turbo.json` `pipeline` key                | `tasks` key                                                   | Turborepo 2.x deprecated `pipeline`. |
| `turbo.build/schema.json` URL              | `turborepo.dev/schema.json`                                   | Domain migrated. |
| recharts v2 (CategoricalChartState)        | recharts v3 (3.8+, hooks API)                                 | Web dashboard uses v3. |
| react-pdf v4                               | `@react-pdf/renderer` (generate) or react-pdf v10 (view)      | v4 is unmaintained. |
| lucide-react v0.460                        | lucide-react v1.14+                                           | Brand icons removed; v1 is ESM-only. |
| `expo build:ios/android`                   | EAS Build (`eas build --profile production`)                  | Classic build was removed in 2023. |
| `SQLite.openDatabase()`                    | `SQLiteProvider` + `useSQLiteContext` (expo-sqlite async API) | Legacy synchronous API moved to `expo-sqlite/legacy`. |
| `uuid-ossp` extension                      | `gen_random_uuid()` built-in (PG13+)                          | Postgres 13+ ships `gen_random_uuid()` natively. |
| `bun.lockb` (binary)                       | `bun.lock` (text format, default since 2025)                  | Text format is reviewable in PRs. |
| Paper v4 `DefaultTheme`                    | Paper v5 `MD3LightTheme` (Material Design 3)                  | MD2 is deprecated; MD3 is the only supported theme. |
| React Query v3 `onSuccess` on queries      | Removed in v5 — use `useEffect` or return values              | `onSuccess` was removed from queries (still on mutations). |
| React Query v3 `cacheTime`                 | `gcTime` (renamed in v5)                                      | Naming changed in v5. |
| AsyncStorage for auth/state                | MMKV (synchronous, no hydration flash)                        | Project uses MMKV exclusively. |
| React Navigation v5 / v6                   | Expo Router (file-based, `Stack.Protected`)                   | Expo Router is the SDK 55 default. |
| Manual JWT verification in Edge Functions  | `@supabase/server` `withSupabase()` (auto JWT + context)      | New `@supabase/server` (May 2026) handles JWT and context. |
| `_shared/supabase.ts` boilerplate          | `@supabase/server` `withSupabase()` (zero shared files)       | Redundant with the new helper. |
| `SUPABASE_ANON_KEY` env var                | `SUPABASE_PUBLISHABLE_KEYS` (publishable-key system)          | New auth-key system supersedes anon keys. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` env var    | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                        | Same naming change on the client side. |
| `@shopify/flash-list` `estimatedItemSize`  | Remove the prop entirely (FlashList v2 uses synchronous layout) | v2 derives layout from the New Architecture; the prop is removed. |
| `expo-av` for sound                        | `expo-audio` (`useAudioPlayer`, `seekTo(0)`)                  | `expo-av` audio is deprecated for new code. |
| `expo-barcode-scanner`                     | `expo-camera` `CameraView` with `barcodeScannerSettings`      | `expo-barcode-scanner` is deprecated. |
| moti / `moti/skeleton`                     | Custom `Animated.View` skeleton with Reanimated 4             | Moti has Reanimated v4 compatibility issues. |
| "BIR-compliant" / "BIR-certified" / "BIR-approved" | "BIR-ready" / "Provisional receipt" (until accreditation) | BIR penalizes misrepresentation. |
| "Official Receipt" wording                 | "Provisional receipt" / "BIR-ready receipt format"            | Same — only allowed once accredited. |

## Forbidden-Patterns Scanner Coverage

The scanner at `scripts/check-forbidden-patterns.mjs` mechanically enforces the subset of these rules that can be detected by regex. It runs at the foundation gate. Rules NOT yet enforced by the scanner (because they require semantic analysis) include:

- React Query `onSuccess` removal — flagged as `\bonSuccess\s*:` which over-matches; manual review still required.
- `cacheTime` removal — flagged as `\bcacheTime\s*:`.
- `DefaultTheme` — flagged as `\bDefaultTheme\b`.

If the scanner flags a non-violation (false positive), discuss in the PR and adjust the regex; do not add an in-file allowlist.

## Versions Referenced

This table is anchored to the verified May 9, 2026 stack. The per-package "verified version" lives in each package's skill doc under "Sources" (DocGate-3). When you bump a package, update its skill doc first, then re-verify this table's "use instead" column still points at the right package.
