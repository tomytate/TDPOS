# Development Workflow

## Branch Strategy

All work happens on feature branches off `main`:

```bash
git checkout -b feat/your-feature-name
# ... work ...
git push origin feat/your-feature-name
# Open PR → foundation gate runs in CI
```

## Commit Format

```
type(scope): description
```

| Type       | When to use                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature or capability               |
| `fix`      | Bug fix                                 |
| `refactor` | Code restructuring (no behavior change) |
| `docs`     | Documentation only                      |
| `test`     | Adding or updating tests                |
| `chore`    | Build, deps, config, CI                 |

Examples:

```
feat(sales): add void workflow with compensating entries
fix(sync): handle concurrent offline deltas
refactor(inventory): extract stock accuracy module
docs(skills): update expo-sqlite patterns for SDK 55
test(kiosk): add order lifecycle tests
chore(deps): bump expo to SDK 55.0.24
```

## Foundation Gate

The 15-stage gate must pass before every commit:

```bash
bun run check:foundation
```

| Stage | Command                       | What it checks                         |
| ----- | ----------------------------- | -------------------------------------- |
| 1     | `format:check`                | Prettier formatting                    |
| 2     | `check:secrets`               | No committed API keys or tokens        |
| 3     | `check:sqlite-schema`         | Local SQLite schema drift              |
| 4     | `check:sqlite-migrations`     | Migration ordering (contiguous v1–v9)  |
| 5     | `check:supabase-rls`          | Every Supabase table enables RLS       |
| 6     | `check:patterns`              | No `console.log()`, forbidden patterns |
| 7     | `check:mobile-no-service-key` | No service-role key reaches mobile     |
| 8     | `check:tier-ui-sources`       | All 5 tier UI references exist         |
| 9     | `check:doc-links`             | Internal doc links resolve             |
| 10    | `check:skill-docs`            | All 27 skill docs present              |
| 11    | `check:expo-doctor`           | Expo native dependency health          |
| 12    | `check:mobile-bundle`         | Android Metro bundle exports           |
| 13    | `typecheck`                   | TypeScript strict across workspaces    |
| 14    | `lint`                        | ESLint 10 (flat config)                |
| 15    | `test`                        | All tests (144 across 28 files)        |

## Code Organization

### Feature Modules

```
src/features/{feature}/
├── lib/               # Pure business logic (testable)
│   ├── execute-checkout.ts
│   └── execute-checkout.test.ts
├── hooks/             # React hooks
│   └── use-daily-sales.ts
└── components/        # UI components (if needed)
```

### Naming Conventions

| Item             | Convention          | Example                    |
| ---------------- | ------------------- | -------------------------- |
| Files            | `kebab-case.ts`     | `execute-checkout.ts`      |
| React components | `PascalCase`        | `SurfacePreview`           |
| Stores           | `{domain}-store.ts` | `cart-store.ts`            |
| Tests            | `{module}.test.ts`  | `execute-checkout.test.ts` |
| Constants        | `UPPER_SNAKE_CASE`  | `TIER_DEFINITIONS`         |
| Types            | `PascalCase`        | `SaleItem`, `TierSurface`  |

### Import Conventions

```typescript
// ✅ Use workspace imports
import { TIER_DEFINITIONS } from '@tdpos/shared'
import type { DbProduct } from '@tdpos/db'

// ❌ Never use relative imports across packages
import { TIER_DEFINITIONS } from '../../../packages/shared/src/constants'
```

## PR Checklist

Every PR must:

- [ ] `bun.lock` committed after dependency changes
- [ ] `bun run check:foundation` passes all 15 stages
- [ ] No "BIR-compliant/certified/approved" language (use "BIR-ready")
- [ ] All new RPCs take `client_operation_id` parameter
- [ ] Inventory changes use deltas, not absolute values
- [ ] New tables have RLS policies enabled
- [ ] New migrations are idempotent (`IF NOT EXISTS`, `IF NOT EXISTS`)
- [ ] No `console.log()` in production code
- [ ] Tests added for new business logic

## Debugging

### Mobile

```bash
bun run dev:mobile    # Start Expo dev server
# Press 'i' for iOS simulator, 'a' for Android emulator
```

### Diagnostics Screen

Navigate to **Settings → Diagnostics** (owner/manager only) to see:

- Sync health (total/synced/pending/failed/reviewable)
- Device identity and install ID
- Last server handshake time
- MMKV storage metrics
- Free disk space
- Copy support bundle to clipboard

### Local Database

The SQLite database is at `tdpos.db` in the app's document directory. You can inspect it on simulators using tools like DB Browser for SQLite.
