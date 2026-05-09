## Description

<!-- Brief description of changes -->

## Type of Change

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `refactor` — Code restructuring
- [ ] `docs` — Documentation
- [ ] `test` — Tests
- [ ] `chore` — Maintenance

## Checklist

- [ ] `bun.lock` is committed after dependency changes
- [ ] `bun run check:foundation` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] No "BIR-compliant/certified/approved" language used (use "BIR-ready")
- [ ] All new RPCs take `client_operation_id` parameter
- [ ] Inventory changes use deltas, not absolute values
- [ ] New tables have RLS policies enabled
