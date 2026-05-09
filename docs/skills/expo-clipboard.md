---
name: expo-clipboard
description: Use this skill when copying diagnostics, support bundles, invite codes, receipt references, or other short text to the system clipboard from the Expo app.
version: 1.0.0
---

# Expo Clipboard — SDK 55

## TD POS Usage

TD POS uses `expo-clipboard` for manager-only diagnostics support bundles. The bundle is generated from sanitized diagnostics data and copied with `Clipboard.setStringAsync()`.

```typescript
import * as Clipboard from 'expo-clipboard'

await Clipboard.setStringAsync(text)
```

## Rules

- Use `setStringAsync()` for writes. Do not use deprecated synchronous clipboard writes.
- Never copy raw `sync_queue.payload`, receipt contents, customer phone numbers, or customer names into support bundles.
- Sanitize error strings before copying diagnostics. Replace obvious email addresses and Philippine phone numbers.
- Keep clipboard actions user-initiated. Do not copy support data automatically.
- Treat support bundles as diagnostic text, not analytics. They are for manager-triggered support only.

## Sources

- Package: `expo-clipboard@~55.0.8` in `apps/mobile/package.json` (installed patch: `55.0.13`)
- Official docs: <https://docs.expo.dev/versions/v55.0.0/sdk/clipboard/>
- Implementation: `apps/mobile/app/(app)/diagnostics.tsx`, `apps/mobile/src/features/diagnostics/lib/support-bundle.ts`
- Last verified: 2026-05-09
