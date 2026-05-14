# FAQ

## General

### What is TD POS?

TD POS is a mobile-first, offline-capable SaaS POS and inventory management system built for Philippine business. Its core innovation is the **tingi/canonical-pieces inventory model** — handling the sale of individual pieces from bulk packs, which no international POS competitor handles correctly.

### Who is TD POS for?

Five tiers serve five segments:

- **Tier A (Free):** Sari-sari stores, market stalls, micro-businesses
- **Tier B (Pro):** Mini-marts, Alfamart-scale stores
- **Tier C (Plus):** Convenience stores, 7-Eleven-scale
- **Tier D (Premium):** Supermarkets
- **Tier E (Enterprise):** Mall chains, department stores

### Is TD POS BIR-compliant?

TD POS is **BIR-ready** — designed to Philippine tax specification — but has not yet received formal BIR accreditation (EOPT certification). We never use "BIR-compliant/certified/approved" until accreditation is granted.

---

## Technical

### Why offline-first instead of cloud-first?

Philippine retail reality: intermittent mobile data, poor WiFi, power outages during typhoons. If the POS requires internet to ring a sale, it fails the market. Every cashier-facing screen works with zero internet.

### Why SQLite instead of a mobile database like Realm or WatermelonDB?

- **expo-sqlite** is the official Expo module with first-class SDK 55 support
- No additional native dependencies to manage
- Full SQL query power for reporting and diagnostics
- Simple migration system that works offline
- Bun's built-in `bun:sqlite` enables fast integration testing

### Why delta-based sync instead of CRDT or last-writer-wins?

- **Simplicity:** deltas are trivial to reason about and implement
- **Correctness:** two offline devices selling from the same stock get the right answer
- **Idempotency:** combined with `client_operation_id`, replays are safe
- **No conflicts:** deltas are commutative — order of application doesn't matter

### Why phone OTP instead of email/password?

- PH market: phone ownership is near-universal, email is less common for small business owners
- Simpler onboarding: no password to forget
- More secure: no credential stuffing attacks
- Supabase Auth handles the OTP flow natively

### Why React Native Paper instead of NativeBase/Tamagui/etc.?

- Material Design 3 out of the box — matches modern Android design language
- Well-maintained with Expo SDK 55 compatibility
- Fabric (New Architecture) support
- Rich component library for POS use cases (FABs, dialogs, data tables)

### Why Zustand instead of Redux?

- Simpler API — no action types, reducers, or middleware boilerplate
- MMKV persistence via a one-line adapter
- Per-domain stores: `auth-store`, `cart-store`, `settings-store`
- TypeScript-first with minimal ceremony

---

## Development

### How do I add a new feature?

1. Read the relevant [skill doc](../skills/) if it exists
2. Create a feature module in `src/features/{feature}/lib/`
3. Write the business logic as pure functions (testable without React)
4. Add tests co-located with the source
5. Create hooks in `src/features/{feature}/hooks/` if needed
6. Wire into the UI via Expo Router screens
7. Run `bun run check:foundation` before committing

### How do I add a new local SQLite table?

1. Add the SQL to `apps/mobile/src/db/migrations.ts` as an exported constant
2. Register it in `LOCAL_MIGRATIONS` with the next version number
3. Add `CREATE TABLE IF NOT EXISTS` for idempotency
4. Run `bun run check:sqlite-migrations` to verify ordering
5. Add tests if the table has business logic

### How do I add a new Supabase migration?

1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Always add RLS policies
3. Always use `gen_random_uuid()` (not `uuid-ossp`)
4. Run `bunx supabase db push` to apply locally
5. Run `bun run check:foundation` to verify

### Why does `check:patterns` block `console.log`?

`console.log()` in production code risks leaking PII (customer data, error messages, auth tokens) into device logs. Use `warnSafe()` from `src/services/safe-logger.ts` instead, which sanitizes error output to just the error kind/class.

### What's the `scripts/use-toolchain.sh` for?

It ensures the correct Node version (24 LTS) is active before running checks. Source it before CI-parity verification:

```bash
source scripts/use-toolchain.sh
bun run check:foundation
```

---

## Deployment

### Can I use Expo Go for testing?

**No.** TD POS uses native modules (expo-sqlite, react-native-mmkv, expo-camera) that are not included in Expo Go. Use EAS development builds instead:

```bash
eas build --profile development --platform ios
```

### How do I deploy a JavaScript-only fix?

Use EAS Update for OTA patches that don't touch native code:

```bash
eas update --branch production --message "Fix cart calculation"
```

### How do I reset my local Supabase?

```bash
bunx supabase db reset   # Drops and recreates all tables
bunx supabase db seed    # Re-seeds demo data
```
