# Tier System

TD POS uses five canonical product tiers. Every surface, module, limit, and upgrade path flows from this model.

## Tier Definitions

| Tier | Internal Key        | Public Name       | Segment                       | Billing      |
| ---- | ------------------- | ----------------- | ----------------------------- | ------------ |
| A    | `tier_a_free`       | Tier A Free       | Sari-sari / micro-stall       | Free forever |
| B    | `tier_b_pro`        | Tier B Pro        | Mini-mart / Alfamart-scale    | Paid monthly |
| C    | `tier_c_plus`       | Tier C Plus       | Convenience / 7-11-scale      | Paid monthly |
| D    | `tier_d_premium`    | Tier D Premium    | Supermarket                   | Paid monthly |
| E    | `tier_e_enterprise` | Tier E Enterprise | Mall / department-store chain | Enterprise   |

## Source of Truth

All tier data flows from a single definition:

```typescript
// packages/shared/src/constants/tier-definitions.ts
import { TIER_DEFINITIONS } from '@tdpos/shared'
```

This includes:

- **Public names and labels**
- **Price (₱/month)** — `null` = pricing coming soon, `0` = free
- **Module unlocks** — which modules are available per tier
- **Surface unlocks** — which mobile/web surfaces are accessible
- **Device limits** — max concurrent devices
- **Branch limits** — max branches
- **User limits** — max team members
- **Upgrade targets** — which tier to suggest upgrading to

## Mobile Surfaces by Tier

### Tier A — Free (Sari-sari)

| Surface          | Description                                       |
| ---------------- | ------------------------------------------------- |
| `mobile.cashier` | Basic POS — product grid, cart, checkout, receipt |

### Tier B — Pro (Mini-mart)

| Surface                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `mobile.tablet_pos`    | Wide product grid with category filters       |
| `mobile.owner_lanes`   | Shift overview for all active cashier lanes   |
| `mobile.shift_login`   | Open shift with opening cash count            |
| `mobile.shift_handoff` | Close shift with final count and handoff note |

### Tier C — Plus (Convenience)

| Surface                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `mobile.convenience_counter` | Quick-scan lookup, running totals, fast-repeat  |
| `mobile.manager_phone`       | Approve/decline discount, void, refund requests |

### Tier D — Premium (Supermarket)

| Surface                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `mobile.supermarket_counter` | Scanner-driven belt-mode product list    |
| `mobile.customer_display`    | Dark customer-facing cart mirror         |
| `mobile.backoffice_audit`    | Sales/inventory/sync health for managers |
| `mobile.weighted_plu`        | PLU code lookup + weight-entry workflow  |

### Tier E — Enterprise (Mall/Chain)

| Surface                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `mobile.hq_rollup`          | Cross-branch sales and stock dashboard            |
| `mobile.self_service_kiosk` | Customer self-order with staff confirmation       |
| `mobile.returns_warranty`   | Receipt lookup, return requests, manager approval |

## Web Surfaces

| Surface         | Tier | Description                                          |
| --------------- | ---- | ---------------------------------------------------- |
| `web.dashboard` | A+   | Sales overview, sync health, quick stats             |
| `web.products`  | A+   | Product/category management                          |
| `web.branches`  | B+   | Multi-branch management                              |
| `web.users`     | B+   | Team member management                               |
| `web.devices`   | B+   | Device registration, heartbeat, lost-device recovery |
| `web.modules`   | B+   | Module toggles, customer privacy, erasure            |
| `web.sync`      | B+   | Sync health monitoring                               |
| `web.audit`     | C+   | Audit log viewer                                     |
| `web.pricing`   | A+   | Tier comparison and upgrade                          |
| `web.hq`        | E    | HQ analytics (enterprise only)                       |

## Entitlement Gating

The mobile app uses an **entitlement cache** with a fail-closed posture:

1. **Tier A cashier** always works — exempt from entitlement checks
2. **Paid surfaces (B–E)** require entitlements refreshed within 7 days
3. If cache is stale (>7 days), paid surfaces show a "Reconnect" card
4. This ensures offline cashier sales continue even during subscription lapses

```
Entitlement check flow:
  Surface requested → Check tier from TIER_DEFINITIONS
  → If Tier A cashier → Always allow
  → If paid surface → Check cache freshness
    → Fresh (<7 days) → Allow
    → Stale (>7 days) → Block with reconnect card
```

## Legacy Migration

The old six-tier model (`free`, `starter`, `growth`, `pro`, `business`, `enterprise`) is normalized via `LEGACY_TIER_MAP`:

```typescript
import { LEGACY_TIER_MAP } from '@tdpos/shared'
// 'free' → 'tier_a_free'
// 'starter' → 'tier_b_pro'
// etc.
```

**Never add new features against legacy tier names.** They exist only for database migration.
