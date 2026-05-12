// Sign-in — first impression for every pilot cashier. Polished for v0.9
// visual QA: safe-area-aware, keyboard-aware form, auto-focused input,
// theme-token colors only, and a brand block that mirrors the web /login
// split-pane brand rail in compact form.

import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper'

import { ErrorBanner } from '@/components/ui/error-banner'
import { useAppTheme } from '@/constants/theme'
import { describeBootstrapFailure } from '@/services/auth-bootstrap'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth-store'
import {
  APP_TAGLINE,
  TIER_A_FREE,
  getTierModuleState,
  isValidPhPhone,
  normalizePhPhone,
} from '@tdpos/shared'

export default function SignInScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setDevice = useAuthStore((state) => state.setDevice)
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus)
  const bootstrapError =
    bootstrapStatus && !bootstrapStatus.ok ? describeBootstrapFailure(bootstrapStatus) : null

  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phoneInputRef = useRef<typeof TextInput.prototype>(null)

  // Auto-focus on mount so the cashier can start typing without a tap.
  // Doesn't trigger keyboard when there's a bootstrap error showing —
  // the error banner takes priority and the user is likely reading it.
  useEffect(() => {
    if (bootstrapError) return
    const handle = setTimeout(() => {
      phoneInputRef.current?.focus?.()
    }, 200)
    return () => clearTimeout(handle)
  }, [bootstrapError])

  const sendOtp = async () => {
    if (submitting) return
    setError(null)

    const normalized = normalizePhPhone(phone.trim())
    if (!isValidPhPhone(normalized)) {
      setError('Enter a valid PH mobile number, e.g. 09171234567.')
      return
    }
    if (!supabase) {
      setError('Supabase not configured. Check apps/mobile/.env.local.')
      return
    }

    setSubmitting(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized })
      if (otpError) {
        setError(otpError.message)
        setSubmitting(false)
        return
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: normalized },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  const continueInDemoMode = () => {
    setAuth({
      userId: 'demo-user',
      businessId: 'demo-business',
      role: 'owner',
      phone: '+639171234567',
      subscriptionTier: TIER_A_FREE,
      modules: getTierModuleState(TIER_A_FREE),
      entitlementsValidUntil: null,
    })
    setDevice({
      branchId: 'demo-branch',
      branchCode: 'QC01',
      branchName: 'Demo branch',
      cashierCode: 'C01',
      storeName: 'TD POS Demo Store',
      storeAddress: 'Quezon City',
    })
    router.replace('/(app)/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          paddingTop: 24 + insets.top,
          paddingBottom: 24 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {__DEV__ ? (
          <Surface
            mode="flat"
            style={{
              padding: 12,
              backgroundColor: theme.tdpos.amber[100],
              borderRadius: 8,
              gap: 4,
            }}
            accessibilityRole="alert"
          >
            <Text variant="labelLarge" style={{ color: theme.tdpos.ink[900] }}>
              Demo mode available
            </Text>
            <Text variant="bodySmall" style={{ color: theme.tdpos.ink[800] }}>
              Real OTP works against your Supabase project. The demo button below seeds local-only
              data and is hidden in production builds.
            </Text>
          </Surface>
        ) : null}

        {/* Brand block — compact mobile analog of the web /login split-pane rail */}
        <View style={{ gap: 6 }}>
          <Text
            variant="headlineLarge"
            style={{ color: theme.colors.primary, fontWeight: '700' }}
            accessibilityRole="header"
          >
            TD POS
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            {APP_TAGLINE}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sign in with your Philippine mobile number to start a shift.
          </Text>
        </View>

        {bootstrapError ? (
          <ErrorBanner title="Account setup needed" message={bootstrapError} />
        ) : null}

        <View style={{ gap: 4 }}>
          <TextInput
            ref={phoneInputRef}
            mode="outlined"
            label="Mobile number"
            placeholder="09171234567"
            autoComplete="tel"
            inputMode="tel"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            disabled={submitting}
            left={<TextInput.Icon icon="phone-outline" />}
            returnKeyType="send"
            onSubmitEditing={() => void sendOtp()}
            accessibilityHint="Enter the number that will receive the SMS code"
          />
          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : (
            <HelperText type="info" visible>
              Leading 0 or +63 both work. We&rsquo;ll send a 6-digit code via SMS.
            </HelperText>
          )}
        </View>

        <Button
          mode="contained"
          icon="send"
          onPress={sendOtp}
          loading={submitting}
          disabled={submitting || phone.trim().length === 0}
          buttonColor={theme.colors.primary}
          contentStyle={{ paddingVertical: 4 }}
          accessibilityLabel="Send one-time code via SMS"
        >
          {submitting ? 'Sending code…' : 'Send one-time code'}
        </Button>

        {__DEV__ ? (
          <Button
            mode="text"
            icon="flask-outline"
            onPress={continueInDemoMode}
            disabled={submitting}
            textColor={theme.tdpos.amber[700]}
            accessibilityLabel="Continue in demo mode (development only)"
          >
            Continue in demo mode
          </Button>
        ) : null}

        <View style={{ marginTop: 8, gap: 6, alignItems: 'center' }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            BIR-ready provisional cashier. BIR accreditation pending.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
