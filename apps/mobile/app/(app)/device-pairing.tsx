// Device pairing — first-run onboarding for a new phone or tablet.
// Polished for v0.9 visual QA: safe-area-aware docked Pair Device CTA
// so the primary action never sits behind the home indicator, a
// status hero card that turns teal when the device is already paired
// (amber when on the fallback shell, neutral when fresh), an
// auto-focused code input so the cashier types straight in, a "Where
// do I get a code?" coach-mark explaining the web flow, and haptic
// success/error feedback on every pair attempt.

import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Appbar,
  Button,
  Card,
  Chip,
  HelperText,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import {
  consumeDevicePairingCode,
  type SupabaseDevicePairingClient,
} from '@/services/device-pairing'
import { getOrCreateInstallId } from '@/services/device-identity'
import {
  upsertDeviceHeartbeat,
  type SupabaseDeviceHeartbeatClient,
} from '@/services/device-heartbeat'
import { storage } from '@/services/storage'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { normalizeDevicePairingCode } from '@tdpos/shared'

export default function DevicePairingScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const db = useSQLiteContext()
  const branchName = useAuthStore((state) => state.branchName)
  const branchCode = useAuthStore((state) => state.branchCode)
  const cashierCode = useAuthStore((state) => state.cashierCode)
  const pairingStatus = useAuthStore((state) => state.devicePairingStatus)
  const devicePairedAt = useAuthStore((state) => state.devicePairedAt)
  const setDevice = useAuthStore((state) => state.setDevice)
  const [pairingCode, setPairingCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const codeInputRef = useRef<typeof TextInput.prototype>(null)

  const normalizedCode = normalizeDevicePairingCode(pairingCode)

  // Auto-focus on mount so the cashier types straight in. Unless the device
  // is already paired — then the input is secondary to the status hero.
  useEffect(() => {
    if (pairingStatus === 'paired') return
    const handle = setTimeout(() => {
      codeInputRef.current?.focus?.()
    }, 250)
    return () => clearTimeout(handle)
  }, [pairingStatus])

  const heroTone =
    pairingStatus === 'paired'
      ? {
          bg: theme.tdpos.teal[50],
          chipBg: theme.tdpos.teal[100],
          chipColor: theme.tdpos.teal[800],
          label: 'Paired',
        }
      : pairingStatus === 'fallback'
        ? {
            bg: theme.tdpos.amber[50],
            chipBg: theme.tdpos.amber[100],
            chipColor: theme.tdpos.amber[700],
            label: 'Fallback identity',
          }
        : {
            bg: theme.colors.surfaceVariant,
            chipBg: theme.colors.surface,
            chipColor: theme.colors.onSurfaceVariant,
            label: 'Not paired',
          }

  const pairDevice = async () => {
    if (submitting) return
    setError(null)
    setSnackbar(null)
    void haptics.tapLight()

    if (!supabase) {
      setError('Supabase is not configured on this build.')
      return
    }

    setSubmitting(true)
    try {
      const installId = getOrCreateInstallId(storage)
      const outcome = await consumeDevicePairingCode({
        supabase: supabase as unknown as SupabaseDevicePairingClient,
        pairingCode: normalizedCode,
        installId,
      })

      if (!outcome.ok) {
        setError(outcome.message)
        void haptics.error()
        return
      }

      const current = useAuthStore.getState()
      setDevice({
        branchId: outcome.branchId,
        branchCode: outcome.branchCode,
        branchName: outcome.branchName,
        cashierCode: outcome.cashierCode,
        pairingStatus: 'paired',
        devicePairingId: outcome.pairingCodeId,
        devicePairedAt: new Date().toISOString(),
        storeName: current.storeName,
        storeAddress: current.storeAddress,
        tin: current.tin,
      })

      const heartbeat = await upsertDeviceHeartbeat({
        supabase: supabase as unknown as SupabaseDeviceHeartbeatClient,
        db,
        surface: outcome.surface,
      })

      setPairingCode('')
      void haptics.success()
      setSnackbar(
        heartbeat.ok
          ? `Paired to ${outcome.branchName} / ${outcome.cashierCode}.`
          : `Paired locally. Heartbeat will retry: ${heartbeat.message ?? heartbeat.reason}.`,
      )
    } catch (err) {
      void haptics.error()
      setError(err instanceof Error ? err.message : 'Could not pair this device.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title="Device pairing" color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          gap: 12,
          padding: 16,
          paddingBottom: 96 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status hero — tone-aware so paired vs fallback vs fresh reads at a glance */}
        <Card mode="contained" style={{ backgroundColor: heroTone.bg }}>
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Current device
              </Text>
              <Chip
                compact
                mode="flat"
                icon={pairingStatus === 'paired' ? 'check-circle-outline' : 'alert-circle-outline'}
                style={{ backgroundColor: heroTone.chipBg }}
                textStyle={{ color: heroTone.chipColor, fontWeight: '600' }}
              >
                {heroTone.label}
              </Chip>
            </View>
            <InfoRow label="Branch" value={branchName ?? 'Not paired'} />
            <InfoRow label="Branch code" value={branchCode ?? '—'} mono />
            <InfoRow label="Cashier" value={cashierCode ?? 'Not paired'} mono />
            {devicePairedAt ? (
              <InfoRow
                label="Paired at"
                value={new Date(devicePairedAt).toLocaleString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              />
            ) : null}
          </Card.Content>
        </Card>

        {/* Pair register form */}
        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <Text variant="titleMedium" accessibilityRole="header">
              Pair this register
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Enter the 8-character code issued from the web Devices page.
            </Text>
            <TextInput
              ref={codeInputRef}
              mode="outlined"
              label="Device code"
              placeholder="ABCD-1234"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              value={pairingCode}
              onChangeText={(value) => setPairingCode(normalizeDevicePairingCode(value))}
              maxLength={16}
              disabled={submitting}
              left={<TextInput.Icon icon="key-outline" />}
              returnKeyType="send"
              onSubmitEditing={() => void pairDevice()}
              accessibilityLabel="Device pairing code"
              accessibilityHint="Pair codes are generated from the web dashboard"
            />
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : (
              <HelperText type="info" visible>
                Codes look like 8 letters and digits, no easily-confused characters.
              </HelperText>
            )}
          </Card.Content>
        </Card>

        {/* Coach-mark — where do I get a code? */}
        <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
          <Card.Content style={{ gap: 6 }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
              accessibilityRole="header"
            >
              Where do I get a code?
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              The owner opens the web dashboard → Devices → “Issue device code,” picks the branch
              and cashier, then reads the full code out to the cashier here. Codes expire after the
              chosen window (default 30 minutes).
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Surface
        mode="elevated"
        elevation={4}
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          mode="contained"
          icon="cellphone-link"
          buttonColor={theme.colors.primary}
          loading={submitting}
          disabled={submitting || normalizedCode.length < 8}
          onPress={pairDevice}
          contentStyle={{ paddingVertical: 4 }}
          accessibilityLabel="Pair this device"
        >
          {submitting ? 'Pairing…' : 'Pair device'}
        </Button>
      </Surface>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3500}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const theme = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={{
          fontWeight: '600',
          fontVariant: mono ? ['tabular-nums'] : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  )
}
