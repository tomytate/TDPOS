# Development Setup

Last verified: May 9, 2026.

This project is mobile-first and foundation-gated. A clean checkout should be able to install, check formatting, verify local SQLite schema drift, scan for forbidden patterns, typecheck, lint, and test through one command.

## Required Tools

| Tool         |            Version | Notes                                                               |
| ------------ | -----------------: | ------------------------------------------------------------------- |
| Node.js      |               20.x | Use `.node-version` or `.nvmrc`. Node 25 is not the project target. |
| Bun          |             1.3.13 | Package manager, runtime, and test runner.                          |
| Supabase CLI |  latest compatible | Needed for local PostgreSQL 17 and migrations.                      |
| EAS CLI      | via `bunx eas-cli` | Preferred over hidden global installs.                              |

## First-Time Setup

```bash
# 1. Use Node 20
nvm use

# 2. Install Bun 1.3.13 if needed
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.13"

# 3. Verify toolchain
node --version
bun --version

# 4. Install dependencies and create bun.lock
bun install

# 5. Run the foundation gate
bun run check:foundation
```

Commit `bun.lock`. Do not commit `bun.lockb`.

## Local Supabase

```bash
bunx supabase start
bunx supabase db push
bunx supabase db seed
```

The app uses the new publishable-key naming:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`.

## Mobile

```bash
bun run mobile:start
bun run mobile:ios
bun run mobile:android
```

Use development builds for real device testing. Expo Go is not a production test target for this app because the native dependency set includes SQLite, MMKV, background tasks, camera, haptics, audio, and printer support.

## Foundation Gate

```bash
bun run check:foundation
```

This runs:

- `prettier --check .`
- local SQLite schema drift check
- forbidden/deprecated pattern scan
- TypeScript
- ESLint
- tests

CI runs the same foundation gate and intentionally requires a committed `bun.lock`.
