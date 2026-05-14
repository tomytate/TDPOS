# Getting Started

## Prerequisites

| Tool             | Version | Install                                     |
| ---------------- | ------- | ------------------------------------------- |
| **Node.js**      | 24 LTS  | `nvm install 24`                            |
| **Bun**          | 1.3.13+ | `curl -fsSL https://bun.sh/install \| bash` |
| **Git**          | 2.x     | Pre-installed on macOS                      |
| **EAS CLI**      | Latest  | `npm install -g eas-cli`                    |
| **Supabase CLI** | 2.98+   | `brew install supabase/tap/supabase`        |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/tomytate/TDPOS.git
cd TDPOS
nvm use               # Switch to Node 24
bun install           # Install all workspace dependencies
```

### 2. Environment files

Copy the example env files:

```bash
cp .env.example apps/mobile/.env.local
cp .env.example apps/web/.env.local
```

Edit each `.env.local` with your Supabase project credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start development

```bash
# Start everything (mobile + web + marketing)
bun run dev

# Or start individually
bun run dev:mobile      # Expo dev server
bun run dev:web         # Next.js dashboard
bun run dev:marketing   # Marketing site
```

### 4. Local Supabase (optional)

For offline development with a local PostgreSQL instance:

```bash
bunx supabase start     # Start local Supabase (Docker required)
bunx supabase db push   # Apply all migrations
bunx supabase db seed   # Seed with demo data
```

### 5. Verify your setup

```bash
source scripts/use-toolchain.sh    # Ensure correct Node version
bun run check:foundation           # Run all 13 gate stages
```

All 13 stages should pass:

1. Prettier format check
2. Committed secret scan
3. SQLite schema drift check
4. SQLite migration ordering
5. Forbidden pattern scan
6. Tier UI source check
7. Doc link integrity
8. Skill doc gate
9. Expo Doctor
10. Android bundle export
11. TypeScript strict check
12. ESLint
13. Tests (128 across 23 files)

## Project Structure

```
TDPOS/
├── apps/
│   ├── mobile/              # Expo SDK 55 (React Native)
│   │   ├── app/             # File-based routes (Expo Router)
│   │   │   ├── (auth)/      # Sign-in, OTP verification
│   │   │   └── (app)/       # Authenticated screens
│   │   │       ├── (tabs)/  # Bottom tabs (Home, Inventory, Reports)
│   │   │       └── surfaces/# Tier-gated surface screens
│   │   └── src/
│   │       ├── db/          # SQLite schema, migrations (v1–v9)
│   │       ├── features/    # Feature modules
│   │       │   ├── sales/   # Checkout, void
│   │       │   ├── inventory/# Stock take, accuracy score
│   │       │   ├── shifts/  # Shift sessions
│   │       │   ├── approvals/# Manager approvals
│   │       │   ├── kiosk/   # Self-service orders
│   │       │   ├── returns/ # Returns/warranty
│   │       │   ├── diagnostics/# Sync health, support bundle
│   │       │   ├── products/# Product/category hooks
│   │       │   ├── reports/ # Daily sales
│   │       │   └── tier-surfaces/# Surface registry and controls
│   │       ├── services/    # Sync, auth, device identity
│   │       └── stores/      # Zustand stores (auth, cart, settings)
│   ├── web/                 # Next.js 16 dashboard
│   │   └── src/app/
│   │       ├── (auth)/      # Login, OTP
│   │       └── (dashboard)/ # Owner/manager views
│   └── marketing/           # Public site (pricing, privacy, terms)
├── packages/
│   ├── shared/              # @tdpos/shared — types, validators, constants
│   └── db/                  # @tdpos/db — database schema types
├── supabase/
│   ├── migrations/          # 17 PostgreSQL migrations
│   ├── functions/           # 4 Edge Functions
│   └── seed.sql             # Demo data
├── scripts/                 # 9 check scripts
├── docs/
│   ├── skills/              # 22 anti-hallucination skill docs
│   └── wiki/                # This wiki
└── UI/                      # Design reference (not production code)
```

## Next Steps

- Read [Architecture Overview](Architecture-Overview.md) to understand the system design
- Read [Tier System](Tier-System.md) to understand the product model
- Read [Development Workflow](Development-Workflow.md) for the day-to-day process
