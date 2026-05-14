---
name: thermal-printer-integration
description: Use this skill when implementing receipt printing, Bluetooth printer connection, or ESC/POS commands. Agents WILL hallucinate wrong package names — the spec v1.0 fabricated a non-existent package. This documents the REAL package and API.
version: 1.0.0
---

# Thermal Printer Integration

## ⚠️ CRITICAL HALLUCINATION WARNING

The spec v1.0 referenced `react-native-thermal-printer-driver` — **THIS PACKAGE DOES NOT EXIST ON NPM.** Agents will fabricate package names for thermal printing. The ONLY verified package is:

**`@haroldtran/react-native-thermal-printer@1.2.0`**

## Fabric / New Architecture Status

- The package uses the **legacy bridge interop layer** — it has NOT been rewritten for TurboModules/Fabric
- It WORKS on SDK 55 (New Architecture) via the automatic interop layer
- Performance impact: minimal for printing (not a hot-path operation)
- **Alternative if bridge breaks:** `react-native-earl-thermal-printer` (explicitly built for New Architecture)
- **Week 1 Day 1 task:** Verify Bluetooth printer connects successfully on SDK 55 before writing receipt code

## Supported Connection Types

| Type | Android | iOS |
|---|---|---|
| Bluetooth (BLE) | ✅ | ✅ |
| USB | ✅ | ❌ |
| Network (LAN/WiFi) | ✅ | ✅ |

## API Usage

```typescript
import { BLEPrinter, USBPrinter, NetPrinter } from '@haroldtran/react-native-thermal-printer'

// Initialize
await BLEPrinter.init()

// Discover printers
const devices = await BLEPrinter.getDeviceList()

// Connect
await BLEPrinter.connectPrinter(deviceAddress)

// Print text
await BLEPrinter.printText('<C>TINDAHAN NI ALING NENA</C>\n')
await BLEPrinter.printText('================================\n')
await BLEPrinter.printText('Palmolive Sachet x3      ₱21.00\n')
await BLEPrinter.printText('Nescafe 3in1 x1           ₱8.00\n')
await BLEPrinter.printText('================================\n')
await BLEPrinter.printText('<B>TOTAL:                 ₱29.00</B>\n')

// Print image (logo)
await BLEPrinter.printImage('base64EncodedImageString')
```

## Receipt Format (BIR-Ready)

```
[Store Logo - optional]
TINDAHAN NI ALING NENA
Holy Spirit, Quezon City
TIN: XXX-XXX-XXX-XXX

PROVISIONAL RECEIPT
Receipt #: QC01-C02-20260506-000123
Date: 2026-05-06 14:32:15
Cashier: Maria

================================
Palmolive Sachet    x3    ₱21.00
  ₱7.00/pc
Nescafe 3in1        x1     ₱8.00
  ₱8.00/pc
================================
SUBTOTAL                  ₱29.00
TOTAL                     ₱29.00
CASH                      ₱50.00
CHANGE                    ₱21.00
================================

Thank you po! Balik ka ulit!
TD POS - BIR-ready receipt format
```

## ❌ DO NOT USE

```tsx
// ❌ DOES NOT EXIST
import ThermalPrinter from 'react-native-thermal-printer-driver'
import { print } from 'react-native-thermal-receipt-printer'
import RNPrinter from 'react-native-printer'

// ✅ CORRECT — the only verified package
import { BLEPrinter } from '@haroldtran/react-native-thermal-printer'
```

## Sources

- Package: `@haroldtran/react-native-thermal-printer@^1.2.0` (verified against `apps/mobile/package.json`)
- npm: <https://www.npmjs.com/package/@haroldtran/react-native-thermal-printer>
- Forbidden-patterns scanner enforces that the fabricated `react-native-thermal-printer-driver` does not appear in code: `scripts/check-forbidden-patterns.mjs`
- ESC/POS reference: <https://reference.epson-biz.com/modules/ref_escpos/>
- Implementation: `apps/mobile/src/services/thermal-printer.ts`,
  `apps/mobile/src/features/receipts/lib/thermal-receipt.ts`, and
  `apps/mobile/app/(app)/printer-settings.tsx`
- TypeScript note: the package publishes TS source as `main`, so the mobile app maps
  `@haroldtran/react-native-thermal-printer` to `src/types/thermal-printer.d.ts` for
  strict local typecheck while Metro still bundles the real package at runtime.
- Fabric / New Architecture status: works on SDK 55 via the legacy bridge interop layer; verify connection on a real device before relying on print UI for a pilot.
- Last verified: 2026-05-14
