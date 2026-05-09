import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, HelperText, Text, TextInput } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { supabase } from '@/services/supabase'
import { isValidPhPhone } from '@tdpos/shared'

export default function VerifyOtpScreen() {
  const theme = useAppTheme()
  const params = useLocalSearchParams<{ phone?: string }>()
  const phone = (params.phone ?? '').toString()

  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    if (submitting) return
    setError(null)

    if (!isValidPhPhone(phone)) {
      setError('Phone number missing. Restart sign-in.')
      return
    }
    if (!/^\d{6}$/.test(token)) {
      setError('Enter the 6-digit code.')
      return
    }
    if (!supabase) {
      setError('Supabase not configured.')
      return
    }

    setSubmitting(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })
      if (verifyError) {
        setError(verifyError.message)
        setSubmitting(false)
        return
      }
      // The auth listener in `_layout.tsx` populates the auth-store from the
      // new session; `Stack.Protected` then flips into `(app)`. No navigation
      // here on success — the listener-driven gate handles it.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code.')
      setSubmitting(false)
    }
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
      <Text variant="headlineMedium">Verify code</Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        Enter the 6-digit code we sent to {phone || 'your phone'}.
      </Text>

      <View style={{ gap: 4 }}>
        <TextInput
          mode="outlined"
          label="One-time code"
          placeholder="123456"
          inputMode="numeric"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
          value={token}
          onChangeText={(value) => setToken(value.replace(/\D/g, ''))}
          disabled={submitting}
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
      </View>

      <Button
        mode="contained"
        onPress={verify}
        loading={submitting}
        disabled={submitting || token.length !== 6}
        buttonColor={theme.colors.primary}
      >
        {submitting ? 'Verifying…' : 'Verify and sign in'}
      </Button>

      <Button mode="text" onPress={() => router.back()} disabled={submitting}>
        Use a different number
      </Button>
    </View>
  )
}
