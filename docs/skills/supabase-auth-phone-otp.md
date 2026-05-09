---
name: supabase-auth-phone-otp
description: Use this skill when implementing authentication, login, signup, OTP verification, or session management. Agents commonly hallucinate Firebase Auth, old Supabase auth-helpers, or email/password patterns. TD POS uses phone OTP exclusively.
version: 1.0.0
---

# Supabase Auth — Phone OTP (TD POS)

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate Firebase Auth patterns, email/password forms, or use deprecated `@supabase/auth-helpers-react`. TD POS uses **phone OTP only** via `@supabase/supabase-js` v2 with MMKV storage (not AsyncStorage).

## Supabase Client Setup (React Native + MMKV)

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { storage } from './storage' // MMKV instance

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Custom MMKV adapter for Supabase auth storage
const mmkvSupabaseStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: mmkvSupabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
})
```

## Phone OTP Flow

### Step 1: Send OTP

```typescript
const sendOtp = async (phone: string) => {
  // Phone must be E.164 format: +639171234567
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
  })
  if (error) throw error
  return data
}
```

### Step 2: Verify OTP

```typescript
const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  if (error) throw error
  // data.session contains the JWT — auto-persisted to MMKV
  return data
}
```

### Step 3: Check Session

```typescript
// For client-side
const {
  data: { session },
} = await supabase.auth.getSession()

// For server-side / web dashboard (Next.js 16)
const { data: claims, error } = await supabase.auth.getClaims()
// claims.sub = user ID, claims.phone = phone number
```

### Sign Out

```typescript
await supabase.auth.signOut()
```

## Auth State Listener

```typescript
// In root _layout.tsx or AuthProvider
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      useAuthStore.getState().setAuth({
        userId: session.user.id,
        businessId: session.user.user_metadata.business_id,
        role: session.user.user_metadata.role,
      })
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().clearAuth()
    }
  })
  return () => subscription.unsubscribe()
}, [])
```

## Philippine Phone Number Validation

```typescript
// E.164 format: +63 + 10-digit number
const PH_PHONE_REGEX = /^\+63[89]\d{9}$/

const validatePhPhone = (phone: string): boolean => {
  return PH_PHONE_REGEX.test(phone)
}

// Input helper: convert 09XX to +639XX
const normalizePhPhone = (input: string): string => {
  if (input.startsWith('0')) return `+63${input.slice(1)}`
  if (input.startsWith('63')) return `+${input}`
  return input // already +63...
}
```

## ❌ DO NOT USE

```tsx
// ❌ Firebase Auth
import { getAuth, signInWithPhoneNumber } from 'firebase/auth'

// ❌ Deprecated auth-helpers
import { createClient } from '@supabase/auth-helpers-react'

// ❌ Email/password (not used in TD POS)
await supabase.auth.signUp({ email, password })

// ❌ AsyncStorage (too slow)
import AsyncStorage from '@react-native-async-storage/async-storage'
auth: {
  storage: AsyncStorage
}

// ✅ MMKV storage adapter
auth: {
  storage: mmkvSupabaseStorage
}
```

## Sources

- Package: `@supabase/supabase-js@^2.105.3` (verified against `apps/mobile/package.json`)
- Official docs: <https://supabase.com/docs/guides/auth/phone-login>
- React Native auth setup: <https://supabase.com/docs/guides/auth/quickstarts/react-native>
- `getClaims` reference: <https://supabase.com/docs/reference/javascript/auth-getclaims>
- E.164 format spec: <https://en.wikipedia.org/wiki/E.164>
- Implementation: `apps/mobile/src/services/supabase.ts`, `apps/mobile/src/stores/auth-store.ts`, `packages/shared/src/utils/index.ts` (`normalizePhPhone`, `isValidPhPhone`)
- Last verified: 2026-05-09
