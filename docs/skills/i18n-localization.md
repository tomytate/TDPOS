---
name: i18n-localization
description: Use this skill when working on translations, localized strings, error messages, or any user-facing text. TD POS uses a centralized translation system with Tagalog (Filipino) as the primary language alongside English.
version: 1.0.0
---

# Internationalization & Localization

## ⚠️ CRITICAL RULE

**Never hardcode user-facing strings in components.** All UI text goes through the translation system. This includes button labels, error messages, placeholder text, toast notifications, and accessibility hints.

## Translation System

TD POS uses a centralized translations file at `apps/mobile/src/i18n/translations.ts` with a lookup hook.

### Structure

```typescript
// In i18n/translations.ts
export const translations = {
  en: {
    // Namespaced by feature area
    'home.greeting': 'Good morning',
    'home.salesCount': '{count} sales today',
    'cart.empty': 'Cart is empty',
    'cart.checkout': 'Checkout',
    'signIn.subtitle': 'Sign in with your Philippine mobile number',
    'signIn.invalidPhone': 'Enter a valid PH mobile number, e.g. 09171234567.',
    'error.networkUnavailable': 'No internet connection. Working offline.',
    'inventory.stockLabel': '{packs} packs + {pieces} pieces',
  },
  fil: {
    'home.greeting': 'Magandang umaga',
    'home.salesCount': '{count} na benta ngayong araw',
    'cart.empty': 'Walang laman ang cart',
    'cart.checkout': 'Bayaran',
    'signIn.subtitle': 'Mag-sign in gamit ang iyong Philippine mobile number',
    'signIn.invalidPhone': 'Maglagay ng tamang PH mobile number, hal. 09171234567.',
    'error.networkUnavailable': 'Walang internet. Nag-o-offline.',
    'inventory.stockLabel': '{packs} packs + {pieces} piraso',
  },
} as const
```

### Usage in Components

```typescript
import { useTranslation } from '@/i18n/use-translation'

function CartScreen() {
  const t = useTranslation()

  return (
    <Text>{t('cart.empty')}</Text>
  )
}
```

## Language Selection

- Stored in MMKV via `settings-store.ts`
- Default: `en` (English)
- Available: `en`, `fil` (Filipino/Tagalog)
- Persists across app restarts

## Key Namespaces

| Namespace | Purpose |
| --- | --- |
| `home.*` | Home/dashboard screen |
| `cart.*` | Cart and checkout flow |
| `signIn.*` | Authentication screens |
| `inventory.*` | Product and stock management |
| `reports.*` | Sales and EOD reports |
| `settings.*` | App settings |
| `error.*` | Error messages and toasts |
| `a11y.*` | Accessibility labels and hints |
| `receipt.*` | Receipt printing text |

## BIR Language Rules

Receipt-facing text has strict BIR language discipline (see `bir-compliance.md`):

- ✅ "Provisional Receipt" (not "Official Receipt")
- ✅ "BIR-ready receipt format" (not "BIR-compliant")
- Receipt constants live in `packages/shared/src/constants/index.ts`
- Mechanical enforcement: `scripts/check-forbidden-patterns.mjs`

## Adding a New Translation

1. Add the key to both `en` and `fil` sections in `translations.ts`
2. Use descriptive dot-notation keys: `{feature}.{element}`
3. Use `{placeholder}` syntax for interpolated values
4. Add accessibility hints with `a11y.` prefix
5. Run `bun run check:patterns` to verify no forbidden BIR wording

## Sources

- Implementation: `apps/mobile/src/i18n/translations.ts`, `apps/mobile/src/i18n/use-translation.ts`
- Settings store: `apps/mobile/src/stores/settings-store.ts` (language preference)
- BIR wording: `packages/shared/src/constants/index.ts`, `docs/skills/bir-compliance.md`
- Last verified: 2026-05-15
