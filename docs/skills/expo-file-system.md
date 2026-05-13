---
name: expo-file-system
description: Use this skill when reading device storage metadata or working with local files in the Expo app with the SDK 55 FileSystem API.
version: 1.0.0
---

# Expo FileSystem — SDK 55

## TD POS Usage

TD POS uses `expo-file-system` for manager diagnostics storage metadata. The diagnostics screen reads free and total disk space so support can spot devices that may fail local SQLite writes, downloads, exports, or future receipt assets because storage is nearly full.

```typescript
import { Paths } from 'expo-file-system'

const availableDiskBytes = Paths.availableDiskSpace
const totalDiskBytes = Paths.totalDiskSpace
```

## Rules

- Use the modern SDK 55 `Paths` API for disk metadata.
- Do not use deprecated legacy methods such as `getFreeDiskStorageAsync()` or `getTotalDiskCapacityAsync()` from the root `expo-file-system` import. Those methods throw at runtime in the modern API.
- Keep diagnostics nullable. If a platform returns an invalid or unsupported value, show a fallback instead of blocking the support bundle.
- Do not write support bundles or raw sync payloads to disk. Manager diagnostics stay user-triggered and clipboard-based unless a future ADR approves file export.
- Treat disk metadata as operational health only; it is not analytics and must not include user files or directory listings.

## Sources

- Package: `expo-file-system@~55.0.20` in `apps/mobile/package.json`
- Official docs: <https://docs.expo.dev/versions/v55.0.0/sdk/filesystem/>
- Implementation: `apps/mobile/src/features/diagnostics/hooks/use-diagnostics-metadata.ts`, `apps/mobile/src/features/diagnostics/lib/diagnostics-metadata.ts`
- Last verified: 2026-05-13
