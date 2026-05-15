# EAS Credentials And Environment Separation (P10.2)

> Status: pre-pilot operational doc. Walks an operator through the credential setup needed to produce TD POS builds for local development, internal pilot preview, and store production. Referenced by the v0.9 P10.2 checklist rows.

**Last updated:** 2026-05-15.

## 1. Build Profiles

`apps/mobile/eas.json` defines three profiles. Each profile pairs with a different Supabase project so a local DB never leaks into a pilot device and a staging build never overwrites prod data.

| Profile       | Distribution             | Supabase Project                 | Use Case                         |
| ------------- | ------------------------ | -------------------------------- | -------------------------------- |
| `development` | Internal, dev client     | Local (`http://127.0.0.1:54321`) | Developer laptops, iOS simulator |
| `preview`     | Internal (TestFlight/PT) | Staging Supabase Pro project     | Pilot phone(s) before v1.0       |
| `production`  | Store (autoIncrement)    | Production Supabase Pro project  | Store submission                 |

The detailed `eas.json` shape lives in `docs/skills/eas-build-deploy.md` (the design reference). The runtime project follows that shape with `env` blocks per profile.

## 2. Where Values Live

Two channels carry secrets — never one. The mobile binary must hold only the publishable/anon key (enforced by `check:mobile-no-service-key`); anything sensitive that _must_ reach the build runner goes through EAS Secrets.

| Value                                                    | Channel                              | Visible To                  |
| -------------------------------------------------------- | ------------------------------------ | --------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`                               | `eas.json` per-profile `env` block   | Build runner + final binary |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                   | `eas.json` per-profile `env` block   | Build runner + final binary |
| `EAS_PROJECT_ID`                                         | `app.config.ts` (one ID per project) | Build runner                |
| Service-role keys / API secrets (PayMongo, Sentry, etc.) | `eas secret:create`                  | Build runner only           |
| Local dev secrets                                        | `.env.local` (gitignored)            | Developer machine only      |
| CI runner secrets                                        | GitHub Actions secrets               | GitHub Actions only         |

`.env.example` in the repo root enumerates the names of every env var the codebase reads. Real values never live in tracked files.

## 3. Initial Setup Walkthrough

One-time, performed by the operator who owns the Apple Developer + Google Play accounts.

### 3a. EAS Account

```bash
npm install --global eas-cli
eas login                # Expo account that owns the project
eas whoami               # Confirm
```

### 3b. Project Init

`apps/mobile/app.config.ts` already declares `expo.extra.eas.projectId`. Confirm it matches the EAS-side project:

```bash
cd apps/mobile
eas project:info
```

If the IDs disagree, fix the source code (not the EAS side); the project ID is canonical in the codebase.

### 3c. Per-Profile Supabase Values

For `preview` and `production`, paste real values into `eas.json` per the documented `env` blocks. The publishable key is safe to commit because it has no privileged access on its own.

For service-role keys or other secrets that should never reach the binary, use EAS Secrets:

```bash
cd apps/mobile
eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value '<value>'
eas secret:create --scope project --name PAYMONGO_SECRET_KEY      --value '<value>'
eas secret:list
```

EAS Secrets are exposed only to the build runner, never embedded in the produced binary.

### 3d. App Store Connect (iOS)

```bash
eas credentials              # Interactive walk through certificates + provisioning profile
```

The walk creates:

- Distribution certificate (one per project)
- Provisioning profile (per bundle ID)
- Push notification key (if/when push lands — not at v0.9)

EAS stores them; nothing reaches the local machine permanently.

### 3e. Google Play (Android)

```bash
eas credentials
```

Requires a service account JSON exported from Google Play Console. Paste the file path into `eas.json` `submit.production.android.serviceAccountKeyPath`. The file must be gitignored. Suggested location: `apps/mobile/.local/google-service-account.json` with `.local/` in `.gitignore`.

## 4. Producing A Preview Build For Pilot Users

```bash
cd apps/mobile
eas build --profile preview --platform android
```

The build runs on EAS servers. When it finishes, the operator gets:

- A signed `.apk` (preview profile) downloadable through the EAS dashboard
- A QR code installable on internal pilot devices
- Optional: distribute via the Expo Go preview app

For iOS:

```bash
eas build --profile preview --platform ios
```

Then submit to TestFlight:

```bash
eas submit --profile preview --platform ios
```

Pilot users install through TestFlight invitations. Their feedback comes through the TestFlight feedback channel + the support runbook.

The first preview build is the gate that flips the P10.2 acceptance row "Team can produce a preview build for pilot users."

## 5. Producing A Production Build

```bash
cd apps/mobile
eas build --profile production --platform all
eas submit --profile production --platform all
```

Production requires:

- Apple App Store Connect listing (screenshots, description, privacy policy URL)
- Google Play Console listing
- Marketing site live (Phase M)
- BIR posture confirmed (Phase 11.5.11 + ADR-009)

## 6. Rotation

| Credential                  | Rotation Trigger                | Process                                                                     |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Supabase publishable key    | Leak (e.g. transcript exposure) | Rotate in Supabase dashboard → update `eas.json` env blocks → trigger build |
| Supabase service-role key   | Leak or quarterly rotation      | Rotate → `eas secret:update SUPABASE_SERVICE_ROLE_KEY ...`                  |
| Apple distribution cert     | Yearly                          | `eas credentials --platform ios`                                            |
| Google service account JSON | When operator changes / yearly  | Recreate in Google Console → replace local file → re-run `eas credentials`  |
| GitHub Actions secrets      | Leak or quarterly rotation      | Update via GitHub repo Settings → Secrets and variables                     |

## 7. Credential Audit

Run before every pilot phase change.

- [ ] `eas project:info` reports the expected project ID.
- [ ] `eas secret:list` matches the expected secret names; no rogue secrets, no missing required ones.
- [ ] `bun run check:mobile-no-service-key` is green (no service-role credential reachable from the mobile binary).
- [ ] `bun run check:secrets` is green on the tracked tree.
- [ ] The Supabase publishable key in `apps/mobile/.env.local` and `apps/web/.env.local` matches the staging or prod project (whichever the pilot phone targets).
- [ ] The leaked transcript publishable key (`sb_publishable_a8lkOLXp…`, 2026-05-14) has been rotated.

## References

- EAS skill doc (build profile structure): `docs/skills/eas-build-deploy.md`
- Pilot readiness rollback flow: `docs/operations/pilot-readiness.md`
- Security posture (logging, RLS, mobile credential containment): `docs/operations/security-and-privacy-posture.md`
- EAS Secrets: <https://docs.expo.dev/build-reference/variables/>
- EAS Credentials: <https://docs.expo.dev/app-signing/managed-credentials/>
- EAS Submit (iOS): <https://docs.expo.dev/submit/ios/>
- EAS Submit (Android): <https://docs.expo.dev/submit/android/>
