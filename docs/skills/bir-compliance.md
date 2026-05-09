---
name: bir-compliance
description: Use this skill when working on BIR-related features, receipt formatting, tax compliance, EOPT preparation, or any marketing/UI copy that mentions BIR.
version: 1.0.0
---

# BIR & EOPT Compliance

## Language Discipline (CRITICAL)

| ✅ Always Use | ❌ Never Use (Until Accredited) |
|---|---|
| "BIR-ready receipt format" | "BIR-compliant" |
| "BIR-ready data export" | "BIR-certified" |
| "Designed to BIR specification" | "BIR-approved" |
| "Provisional receipts (legal for non-VAT under ₱3M)" | "Official Receipts" |
| "Sales Invoice format ready for accreditation" | "Sales Invoice" (without qualifier) |

**Why:** BIR penalizes misrepresentation. Using "BIR-compliant" before accreditation is a liability.

## Tiered BIR Strategy

| Tier | Status | Approach |
|---|---|---|
| Free | Provisional receipts only | Legal for non-VAT micro <₱3M |
| Starter | Provisional receipts | BIR-spec format, ready for accreditation |
| Growth | Partner-accredited | Umbrella Cloud-Based POS Provider accreditation |
| Pro | Full accreditation + eSales | Automated BIR portal submission |
| Business | Full + EOPT-ready | e-invoice schema active |
| Enterprise | Custom + EOPT certified | Dedicated compliance support |

## Receipt Required Fields

- Store name, TIN, address
- Date, time
- Item description, quantity (pieces or packs as sold), unit price, amount
- Total, VAT (if applicable)
- Sequential receipt number (BRANCH-CASHIER-DATE-SEQUENCE format)
- BIR accreditation statement (accredited tiers only)
- EOPT QR code (EOPT-active tiers only)
- Optional store logo

## EOPT (RA 11976)

- E-invoicing pilot expanding through 2026
- Schema must be ready even if accreditation is deferred
- `eopt_invoices` table prepared in schema
- `eopt_accredited` boolean on `businesses` table

## Accreditation Economics

- Fee: ₱5,600 per device via eAccReg (7-14 business days)
- Free/Starter: not required
- Growth: umbrella accreditation covers all devices
- Pro/Business: ₱5,600 pass-through (optional add-on)
- Enterprise: included in setup fee

## Sources

Domain skill — no external package. Authority lives in BIR statutes and the project's centralized copy constants.

- BIR / RA references: RA 11976 (EOPT), RA 10963 (TRAIN), RR 16-2018 (provisional receipts), RR 8-2024 (e-invoicing roll-out).
- Centralized copy: `packages/shared/src/constants/index.ts` (`BIR_RECEIPT_HEADER`, `BIR_RECEIPT_FOOTER`, `BIR_RECEIPT_NOTE`).
- Mechanical enforcement: `scripts/check-forbidden-patterns.mjs` (forbids "BIR-compliant", "BIR-certified", "BIR-approved", "Official Receipt", "Sales Invoice").
- Last verified: 2026-05-09. Re-verify whenever the BIR publishes new RR/RMC/RMO that touches receipts or e-invoicing.
