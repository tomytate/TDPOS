// Sign-in — first impression for every pilot cashier. Polished for v0.9
// visual QA: safe-area-aware, keyboard-aware form, auto-focused input,
// theme-token colors only, and a brand block that mirrors the web /login
// split-pane brand rail in compact form. EN + TL parity via `useT()`.

import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, HelperText, Text, TextInput } from 'react-native-paper'

import { ErrorBanner } from '@/components/ui/error-banner'
import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'
import { describeBootstrapFailure } from '@/services/auth-bootstrap'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { APP_TAGLINE, isValidPhPhone, normalizePhPhone } from '@tdpos/shared'

export default function SignInScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const t = useT()
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
      setError(t('signIn.invalidPhone'))
      return
    }
    if (!supabase) {
      setError(t('signIn.supabaseMissing'))
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
      setError(err instanceof Error ? err.message : t('signIn.otpFailedFallback'))
    } finally {
      setSubmitting(false)
    }
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
            {t('signIn.subtitle')}
          </Text>
        </View>

        {bootstrapError ? (
          <ErrorBanner title={t('signIn.bootstrapErrorTitle')} message={bootstrapError} />
        ) : null}

        <View style={{ gap: 4 }}>
          <TextInput
            ref={phoneInputRef}
            mode="outlined"
            label={t('signIn.phoneLabel')}
            placeholder={t('signIn.phonePlaceholder')}
            autoComplete="tel"
            inputMode="tel"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            disabled={submitting}
            left={<TextInput.Icon icon="phone-outline" />}
            returnKeyType="send"
            onSubmitEditing={() => void sendOtp()}
            accessibilityHint={t('signIn.phoneAccessibilityHint')}
          />
          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : (
            <HelperText type="info" visible>
              {t('signIn.phoneHint')}
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
          accessibilityLabel={t('signIn.sendCodeAccessibility')}
        >
          {submitting ? t('signIn.sendingCode') : t('signIn.sendCode')}
        </Button>

        <View style={{ marginTop: 8, gap: 6, alignItems: 'center' }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('signIn.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
