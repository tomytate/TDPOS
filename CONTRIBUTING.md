# Contributing to TD POS

Thank you for your interest in contributing to TD POS!

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies:

```bash
nvm use          # Node 24 LTS
bun install      # Install all workspace deps
```

3. Create a feature branch:

```bash
git checkout -b feat/your-feature-name
```

4. Make your changes and verify:

```bash
bun run check:foundation    # Must pass all 13 stages
```

## Development Workflow

### Architecture Rules (Non-Negotiable)

Before writing code, understand these constraints:

- **Offline-first** — every cashier-facing screen must work with zero internet
- **Canonical pieces** — `stock_pieces` INTEGER only, packs derived via `divmod`
- **Delta-based sync** — send `-1`, never absolute stock values
- **Immutable sales** — no UPDATE/DELETE, corrections via void/compensating entries
- **RLS on every table** — no exceptions
- **Idempotent RPCs** — every mutation takes `client_operation_id`

### Coding Standards

- TypeScript strict mode — do NOT set `strict: false`
- Single quotes, no semicolons, 2-space indent
- Functional patterns, no classes for state
- Zod 4: use `error:` param, not `message:`
- File naming: `kebab-case.ts` for files, `PascalCase` for React components
- Feature-oriented: `src/features/{feature}/lib|hooks|components`
- No `console.log()` in production code — use `warnSafe()` for error paths

### Skills Documentation

Read the relevant [skill docs](docs/skills/) before touching these areas:

- **Inventory:** `docs/skills/inventory-tingi-model.md`
- **Sync:** `docs/skills/sync-engine.md`
- **Receipts:** `docs/skills/receipt-numbering.md`
- **BIR compliance:** `docs/skills/bir-compliance.md`
- **Supabase RLS:** `docs/skills/supabase-rls.md`
- **Deprecations:** `docs/skills/deprecations.md` — **read before adding any dependency**

## Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:

```
feat(sales): add tingi cart calculation
fix(sync): handle concurrent offline deltas
docs(skills): update expo-sqlite patterns for SDK 55
test(inventory): add stock take adjustment tests
```

## Pull Request Process

1. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
2. Ensure `bun run check:foundation` passes (all 13 stages)
3. Include test coverage for new functionality
4. Update relevant documentation if behavior changes
5. No "BIR-compliant/certified/approved" language — only "BIR-ready"

## BIR Language Discipline

TD POS is designed to Philippine tax specification but is **not yet BIR-accredited**. Never use:

- ❌ "BIR-compliant"
- ❌ "BIR-certified"
- ❌ "BIR-approved"
- ✅ "BIR-ready" (until formal accreditation)

## Questions?

Open a [discussion](https://github.com/tomytate/TDPOS/discussions) or reach out to the maintainers.
