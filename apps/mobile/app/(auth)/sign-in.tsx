import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper'

import { ErrorBanner } from '@/components/ui/error-banner'
import { useAppTheme } from '@/constants/theme'
import { describeBootstrapFailure } from '@/services/auth-bootstrap'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { TIER_A_FREE, getTierModuleState, isValidPhPhone, normalizePhPhone } from '@tdpos/shared'

export default function SignInScreen() {
  const theme = useAppTheme()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setDevice = useAuthStore((state) => state.setDevice)
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus)
  const bootstrapError =
    bootstrapStatus && !bootstrapStatus.ok ? describeBootstrapFailure(bootstrapStatus) : null

  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
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
        >
          <Text variant="labelLarge" style={{ color: theme.tdpos.ink[900] }}>
            DEMO MODE AVAILABLE
          </Text>
          <Text variant="bodySmall" style={{ color: theme.tdpos.ink[800] }}>
            Real OTP works against your Supabase project. Demo button below seeds local-only data
            and is hidden in production builds.
          </Text>
        </Surface>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text variant="headlineMedium">TD POS</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Sign in with your Philippine mobile number.
        </Text>
      </View>

      {bootstrapError ? (
        <ErrorBanner title="Account setup needed" message={bootstrapError} />
      ) : null}

      <View style={{ gap: 4 }}>
        <TextInput
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
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
      </View>

      <Button
        mode="contained"
        onPress={sendOtp}
        loading={submitting}
        disabled={submitting || phone.trim().length === 0}
        buttonColor={theme.colors.primary}
      >
        {submitting ? 'Sending OTP…' : 'Send one-time code'}
      </Button>

      {__DEV__ ? (
        <Button
          mode="text"
          onPress={continueInDemoMode}
          disabled={submitting}
          textColor={theme.tdpos.amber[700]}
        >
          Continue in demo mode (dev only)
        </Button>
      ) : null}

      <Text
        variant="bodySmall"
        style={{
          marginTop: 8,
          textAlign: 'center',
          color: theme.colors.onSurfaceVariant,
        }}
      >
        BIR-ready provisional cashier. BIR accreditation pending.
      </Text>
    </View>
  )
}
