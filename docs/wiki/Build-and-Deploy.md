# Build & Deploy

## Build System

TD POS uses **EAS Build** (Expo Application Services) for all native builds. Classic `expo build` was removed in 2023.

## Build Profiles

Defined in `apps/mobile/eas.json`:

| Profile       | Purpose                      | Distribution            |
| ------------- | ---------------------------- | ----------------------- |
| `development` | Dev builds with debugger     | Internal                |
| `preview`     | Testing builds (no debugger) | Internal                |
| `production`  | Store-ready builds           | App Store / Google Play |

## Building

### Development Builds

```bash
# Both platforms
eas build --profile development --platform all

# iOS only
eas build --profile development --platform ios

# Android only
eas build --profile development --platform android
```

Development builds include:

- React Native debugger support
- Expo dev client
- Development server connection

> ⚠️ **Do not use Expo Go** for production testing. Dev builds are required because TD POS uses native modules (SQLite, MMKV, Camera) that Expo Go doesn't include.

### Production Builds

```bash
eas build --profile production --platform all
```

Production builds:

- Are optimized and minified
- Include proper app signing
- Are ready for store submission

## Store Submission

```bash
# Submit to both stores
eas submit --profile production --platform all

# iOS App Store only
eas submit --profile production --platform ios

# Google Play only
eas submit --profile production --platform android
```

### Prerequisites

- **iOS:** Apple Developer Program membership, App Store Connect setup
- **Android:** Google Play Console setup, signing key generated

## OTA Updates

For JavaScript-only changes (no native module changes):

```bash
eas update --branch production --message "Fix cart calculation"
```

OTA updates:

- ✅ JavaScript/TypeScript code changes
- ✅ Image and asset changes
- ❌ Native module additions/updates (requires new build)
- ❌ `app.config.ts` changes (requires new build)

## Pre-Build Verification

Always run before building:

```bash
# Full foundation gate
bun run check:foundation

# Specific build-related checks
bun run check:expo-doctor     # Native dependency health
bun run check:mobile-bundle   # Android Metro bundle exports
```

## App Configuration

The app configuration lives in `apps/mobile/app.config.ts`:

```typescript
export default {
  expo: {
    name: 'TD POS',
    slug: 'tdpos',
    version: '0.9.0',
    // ...
  },
}
```

Key settings:

- **Bundle identifier:** configured per platform
- **Permissions:** camera (barcode scanner), background tasks
- **Plugins:** expo-sqlite, expo-background-task, expo-camera

## CI/CD

The GitHub Actions workflow (`.github/workflows/foundation.yml`) runs the full 15-stage foundation gate on every PR. Store builds and submissions are triggered manually via EAS CLI.

## Supabase Deployment

### Migrations

```bash
# Apply migrations to hosted Supabase
bunx supabase db push

# Check migration status
bunx supabase migration list
```

### Edge Functions

```bash
# Deploy all functions
bunx supabase functions deploy

# Deploy specific function
bunx supabase functions deploy apply-inventory-delta
```
