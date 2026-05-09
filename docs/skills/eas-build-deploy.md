---
name: eas-build-deploy
description: Use this skill when building native apps, deploying to app stores, configuring eas.json, app.config.ts, or handling code signing. Agents hallucinate old expo build patterns or manual Xcode/Android Studio flows. TD POS uses EAS Build exclusively.
version: 1.0.0
---

# EAS Build & Deploy — iOS + Android

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate `expo build:android` or `expo build:ios` — these are the **CLASSIC BUILD** commands that were **removed in 2023**. TD POS uses **EAS Build** exclusively. Agents also hallucinate manual Xcode/Gradle signing flows — EAS handles all credentials automatically.

## Project Configuration

### eas.json (Build Profiles)

```json
{
  "cli": {
    "version": ">= 18.11.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "http://localhost:54321",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "local-dev-key"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://staging.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "staging-key"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://prod.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "prod-key"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### app.config.ts (Dynamic Config)

```typescript
// apps/mobile/app.config.ts
import type { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TD POS',
  slug: 'tdpos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'tdpos',
  userInterfaceStyle: 'automatic',
  newArchEnabled: undefined, // Removed in SDK 55 — New Architecture is mandatory
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tomytatestudios.tdpos',
    infoPlist: {
      NSBluetoothAlwaysUsageDescription: 'TD POS needs Bluetooth to connect to receipt printers.',
      NSBluetoothPeripheralUsageDescription:
        'TD POS needs Bluetooth to connect to receipt printers.',
      BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1B5E20',
    },
    package: 'com.tomytatestudios.tdpos',
    permissions: [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_SCAN',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-background-task',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 35,
        },
        ios: {
          deploymentTarget: '16.0',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
})
```

## Essential Commands

```bash
# First time setup
npx eas-cli login
npx eas-cli build:configure

# Development (includes dev client for local JS loading)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview (internal testing — Ad Hoc / APK)
eas build --profile preview --platform all

# Production (store submission)
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform ios --latest
eas submit --profile production --platform android --latest

# OTA Update (no native rebuild needed)
eas update --branch production --message "fix: receipt alignment"
```

## Store Submission Checklist

### Apple App Store

- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect app created
- [ ] Privacy manifest (required 2025+)
- [ ] `usesNonExemptEncryption: false` (no custom encryption)
- [ ] Bluetooth usage description in Info.plist
- [ ] Background task identifier registered

### Google Play Store

- [ ] Google Developer account ($25 one-time)
- [ ] App manually uploaded once (first time only)
- [ ] `google-service-account.json` for automated submission
- [ ] Target SDK 35 (Android 15 requirement); compile SDK 36 for current AndroidX AAR metadata
- [ ] Bluetooth permissions with `maxSdkVersion` handling

## ❌ DO NOT USE

```bash
# ❌ REMOVED — Classic Build (deprecated 2023)
expo build:android
expo build:ios

# ❌ WRONG — Manual signing
open ios/TDPOS.xcworkspace  # Don't manually open Xcode
cd android && ./gradlew assembleRelease  # Don't manually build

# ❌ WRONG — Expo Go for production testing (use dev builds)
npx expo start  # Only for quick prototyping

# ✅ CORRECT
eas build --profile development --platform ios
eas build --profile production --platform all
eas submit --profile production --platform all
```

## Sources

- CLI: `eas-cli` (run via `bunx eas-cli`); CLI minimum pinned in `eas.json` (`"version": ">= 18.11.0"`)
- Official docs: <https://docs.expo.dev/eas/>
- EAS Build: <https://docs.expo.dev/build/introduction/>
- EAS Submit: <https://docs.expo.dev/submit/introduction/>
- EAS Update: <https://docs.expo.dev/eas-update/introduction/>
- `eas.json` reference: <https://docs.expo.dev/build-reference/eas-json/>
- Apple App Store Privacy Manifests (2025+): <https://developer.apple.com/documentation/bundleresources/privacy_manifest_files>
- Google Play target SDK requirement (2025): <https://developer.android.com/google/play/requirements/target-sdk>
- Implementation: `eas.json`, `apps/mobile/app.config.ts`
- Last verified: 2026-05-10
