# TD POS Wiki

Welcome to the TD POS documentation wiki — the comprehensive reference for building, maintaining, and deploying TD POS.

> **"Tama ang stock mo. Lagi."** — Your stock is correct. Always.

## Quick Navigation

### Getting Started

- [Home](Home.md) — you are here
- [Getting Started](Getting-Started.md) — setup, prerequisites, first run
- [Architecture Overview](Architecture-Overview.md) — system design, data flow, offline-first model

### Core Concepts

- [Tier System](Tier-System.md) — five product tiers (A–E), surface unlocks, module gating
- [Inventory Model](Inventory-Model.md) — canonical pieces, tingi logic, stock accuracy
- [Offline-First Design](Offline-First-Design.md) — SQLite, sync queue, delta-based sync, conflict resolution
- [Sales & Receipts](Sales-and-Receipts.md) — checkout flow, receipt numbering, voids, immutability

### Development

- [Development Workflow](Development-Workflow.md) — branching, commits, foundation gate, PR process
- [Testing Guide](Testing-Guide.md) — test structure, writing tests, running the suite
- [Database Guide](Database-Guide.md) — local SQLite migrations, Supabase migrations, schema

### Deployment

- [Build & Deploy](Build-and-Deploy.md) — EAS Build, store submission, OTA updates
- [Supabase Backend](Supabase-Backend.md) — Edge Functions, RLS, auth, migrations

### Reference

- [Glossary](Glossary.md) — domain terms, acronyms, Philippine commerce context
- [FAQ](FAQ.md) — frequently asked questions

---

_Last updated: 2026-05-14_
