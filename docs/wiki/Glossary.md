# Glossary

## Domain Terms

| Term                 | Definition                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Tingi**            | Tagalog for "to sell individually" — selling products by the piece from a bulk pack. The core inventory model of TD POS.                |
| **Sari-sari store**  | Small neighborhood convenience store, the most common retail format in the Philippines. Typically run by one person from a home window. |
| **Canonical pieces** | The practice of storing all stock as `stock_pieces` (INTEGER) — the smallest sellable unit. Packs are a display concept.                |
| **Delta sync**       | Sending inventory changes as relative values (`-1`) instead of absolute values (`stock = 49`). Prevents concurrent offline overwrites.  |
| **BIR**              | Bureau of Internal Revenue — the Philippine tax authority. TD POS is "BIR-ready" (designed to spec) but not yet "BIR-accredited".       |
| **EOPT**             | Electronic Official Point of Sale Terminal — BIR's terminology for accredited POS systems.                                              |
| **Utang**            | Tagalog for "debt/credit" — an opt-in module for tracking customer credit. Default OFF.                                                 |
| **DAR-30**           | North star metric: one sari-sari store completes ≥5 sales/day on ≥25 of 30 consecutive days.                                            |
| **SAS**              | Stock Accuracy Score — ratio of correctly counted products vs total counted. The marketing weapon.                                      |
| **PLU**              | Price Look-Up code — used in supermarkets for weighted produce and bulk items.                                                          |

## Technical Terms

| Term                    | Definition                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| **client_operation_id** | UUIDv4 sent with every state-mutating RPC for idempotent deduplication.                                      |
| **applied_operations**  | Server-side table storing processed operation IDs for dedup via `ON CONFLICT DO NOTHING`.                    |
| **sync_queue**          | Local SQLite table holding outbound writes waiting to be pushed to the server.                               |
| **fail-closed**         | The entitlement cache strategy: if cache is stale (>7 days), paid surfaces are blocked rather than allowed.  |
| **compensating entry**  | A negative sale that reverses the effects of an original sale (used for voids and returns).                  |
| **receipt namespace**   | The `BRANCH-CASHIER-DATE-SEQUENCE` format that makes offline receipt collisions physically impossible.       |
| **surface**             | A UI view/screen gated by tier entitlement (e.g., `mobile.cashier`, `web.dashboard`).                        |
| **heartbeat**           | Periodic signal from a mobile device indicating it's active. Used for device management and stale detection. |
| **grace period**        | The 7-day window during which cached entitlements remain valid for paid surface access.                      |

## Architecture Acronyms

| Acronym    | Full Form                                             |
| ---------- | ----------------------------------------------------- |
| **ADR**    | Architecture Decision Record                          |
| **RLS**    | Row Level Security (PostgreSQL/Supabase)              |
| **RPC**    | Remote Procedure Call (Supabase function calls)       |
| **OTP**    | One-Time Password (phone auth)                        |
| **EAS**    | Expo Application Services (build & deploy)            |
| **OTA**    | Over-The-Air (JavaScript-only updates via EAS Update) |
| **PII**    | Personally Identifiable Information                   |
| **TOCTOU** | Time-of-Check-to-Time-of-Use (race condition class)   |
| **MD3**    | Material Design 3 (React Native Paper theming)        |
| **SSR**    | Server-Side Rendering (Next.js web dashboard)         |

## Product Tiers

| Short      | Internal Key        | Target Segment                |
| ---------- | ------------------- | ----------------------------- |
| **Tier A** | `tier_a_free`       | Sari-sari / micro-stall       |
| **Tier B** | `tier_b_pro`        | Mini-mart / Alfamart-scale    |
| **Tier C** | `tier_c_plus`       | Convenience / 7-11-scale      |
| **Tier D** | `tier_d_premium`    | Supermarket                   |
| **Tier E** | `tier_e_enterprise` | Mall / department-store chain |

## Philippine Commerce Context

| Concept               | Explanation                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sari-sari**         | Window-front micro-stores found in every neighborhood. Sell small quantities of everything — shampoo sachets, individual cigarettes, cooking oil by the cup. |
| **Tingi sales**       | Breaking bulk packs into individual pieces for sale. A 12-pack of soap sold one bar at a time. This is the dominant retail pattern.                          |
| **Palengke**          | Wet/dry market — where small business owners buy their wholesale stock.                                                                                      |
| **Alfamart/Ministop** | Philippine convenience store chains — the Tier B target segment.                                                                                             |
| **7-Eleven PH**       | Largest convenience chain in PH — the Tier C target segment.                                                                                                 |
| **SM/Robinsons**      | Major mall/supermarket groups — the Tier D/E target segment.                                                                                                 |
| **GCash/Maya**        | Dominant mobile payment platforms in PH (future payment integration).                                                                                        |
