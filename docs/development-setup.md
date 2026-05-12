# Development Setup

Last verified: May 12, 2026.

This project is mobile-first and foundation-gated. A clean checkout should be able to install, check formatting, scan for committed secrets, verify local SQLite schema drift, scan for forbidden patterns, typecheck, lint, and test through one command.

## Required Tools

| Tool         |            Version | Notes                                                                                                        |
| ------------ | -----------------: | ------------------------------------------------------------------------------------------------------------ |
| Node.js      |               24.x | Use `.node-version` or `.nvmrc`. Expo SDK 55 requires Node 20.19.x minimum; TD POS pins current LTS Node 24. |
| Bun          |             1.3.13 | Package manager, runtime, and test runner.                                                                   |
| Supabase CLI |  latest compatible | Needed for local PostgreSQL 17 and migrations.                                                               |
| EAS CLI      | via `bunx eas-cli` | Preferred over hidden global installs.                                                                       |

## First-Time Setup

```bash
# 1. Use Node 24
nvm use

# 2. Install Bun 1.3.13 if needed
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.13"

# 3. Verify toolchain
node --version
bun --version
bun run check:toolchain

# 4. Install dependencies and create bun.lock
bun install

# 5. Run the foundation gate
bun run check:foundation
```

Commit `bun.lock`. Do not commit `bun.lockb`.

## Project Toolchain PATH

If the host has another global Node before Node 24 in `PATH`, source the repo helper before running project commands:

```bash
source scripts/use-toolchain.sh
bun run check:toolchain
```

On this workstation, Node 24 is installed through Homebrew at `/usr/local/opt/node@24/bin`, Bun 1.3.13 is installed at `~/.bun/bin`, and Supabase CLI is installed at `/usr/local/bin/supabase`. The helper prepends the Node 24 and Bun paths without force-linking over the root-owned global Node binary.

## Local Supabase

Local Supabase requires Docker or a Docker-compatible runtime. The CLI is installed, but `supabase start` will fail until the Docker daemon is available.

```bash
source scripts/use-toolchain.sh
supabase status
bunx supabase start
bunx supabase db push
bunx supabase db seed
```

Phone OTP also needs an SMS provider or a local test-number strategy. The committed config includes `auth.sms.test_otp` for development, but the CLI still warns when no provider is enabled; do not close P7.1 real OTP until hosted staging confirms the actual provider path.

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

## Web And Marketing

```bash
bun run dev:web
bun run dev:marketing
bun --filter @tdpos/web build
bun --filter @tdpos/marketing build
```

The dashboard and marketing site are separate Next.js apps. Both use Next.js 16, React 19.2.0, Tailwind 4 tokens, and shared tier definitions from `@tdpos/shared`. Keep React aligned with the mobile app's Expo SDK 55-compatible version so Expo Doctor does not see duplicate native-module dependencies.

## Foundation Gate

Before the foundation gate, run:

```bash
bun run check:toolchain
```

This intentionally fails when the shell is not using Node 24.x, Bun 1.3.13 is not installed as `bun`, Supabase CLI is missing, or EAS cannot be reached through either a direct `eas` command or the `bunx` runner.

```bash
bun run check:foundation
```

This runs:

- `prettier --check .`
- committed-secret pattern scan
- local SQLite schema drift check
- forbidden/deprecated pattern scan
- tier UI source reference check
- markdown link integrity check
- skill-doc source metadata check
- Expo Doctor native dependency check
- Android Metro bundle/export check
- TypeScript
- ESLint
- tests

CI runs the same foundation gate and intentionally requires a committed `bun.lock`.
