// Shift session UI — embedded in Tier B+ surface controls.
// Provides shift login (open with cash count) and handoff (close with final count).
// Reads/writes through shift-sessions.ts local persistence.

import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Button, Card, Snackbar, Text, TextInput } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import {
  closeShift,
  getOpenShift,
  getShiftSummary,
  startShift,
  type LocalShiftSession,
  type ShiftSummary,
} from '@/features/shifts/lib/shift-sessions'
import type { MobileTierSurface } from '@/features/tier-surfaces/surface-scaffolds'
import { getOrCreateInstallId } from '@/services/device-identity'
import { storage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth-store'
import { formatMoney } from '@tdpos/shared'

function secondsToTime(value: number | null | undefined): string {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function numberFromInput(value: string): number {
  const parsed = Number(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function SummaryTiles({ shift, summary }: { shift: LocalShiftSession; summary: ShiftSummary }) {
  const theme = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {[
        ['Opened', secondsToTime(shift.opened_at)],
        ['Sales', String(summary.saleCount)],
        ['Cash sales', formatMoney(summary.cashSales)],
        ['Expected', formatMoney(summary.expectedCash)],
      ].map(([label, value]) => (
        <View
          key={label}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 8,
            borderWidth: 1,
            flex: 1,
            minWidth: 118,
            padding: 10,
          }}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <Text variant="titleMedium" style={{ marginTop: 4 }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function ShiftSurfaceControls({ surface }: { surface: MobileTierSurface }) {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const businessId = useAuthStore((state) => state.businessId)
  const branchId = useAuthStore((state) => state.branchId)
  const branchName = useAuthStore((state) => state.branchName)
  const userId = useAuthStore((state) => state.userId)
  const cashierCode = useAuthStore((state) => state.cashierCode)

  const [openShift, setOpenShift] = useState<LocalShiftSession | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [openingCash, setOpeningCash] = useState('0')
  const [countedCash, setCountedCash] = useState('0')
  const [handoffNote, setHandoffNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [installId] = useState(() => getOrCreateInstallId(storage))

  const identity = useMemo(
    () => ({
      businessId,
      branchId,
      userId,
      cashierCode,
      installId,
    }),
    [businessId, branchId, cashierCode, installId, userId],
  )

  const loadShiftSnapshot = useCallback(async () => {
    const shift = await getOpenShift(db, identity)
    if (!shift) return { shift: null, summary: null }

    return { shift, summary: await getShiftSummary(db, shift) }
  }, [db, identity])

  const refresh = useCallback(async () => {
    const snapshot = await loadShiftSnapshot()
    setOpenShift(snapshot.shift)
    setSummary(snapshot.summary)
    if (snapshot.summary) setCountedCash(String(snapshot.summary.expectedCash))
  }, [loadShiftSnapshot])

  useEffect(() => {
    let cancelled = false

    void loadShiftSnapshot().then((snapshot) => {
      if (cancelled) return
      setOpenShift(snapshot.shift)
      setSummary(snapshot.summary)
      if (snapshot.summary) setCountedCash(String(snapshot.summary.expectedCash))
    })

    return () => {
      cancelled = true
    }
  }, [loadShiftSnapshot])

  const onStart = async () => {
    if (busy) return
    setBusy(true)
    const result = await startShift({
      db,
      identity,
      openingCash: numberFromInput(openingCash),
    })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setOpenShift(result.shift)
    setSummary(result.summary ?? null)
    setCountedCash(String(result.summary?.expectedCash ?? result.shift.opening_cash))
    setMessage('Shift opened locally. Sales from this cashier lane can now be grouped.')
  }

  const onClose = async () => {
    if (busy) return
    setBusy(true)
    const result = await closeShift({
      db,
      identity,
      countedCash: numberFromInput(countedCash),
      handoffNote: handoffNote.trim() || undefined,
    })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    const variance = result.shift.variance ?? 0
    setOpenShift(null)
    setSummary(null)
    setHandoffNote('')
    setOpeningCash(String(result.shift.counted_cash ?? 0))
    setMessage(`Shift closed locally. Variance: ${formatMoney(variance)}.`)
  }

  if (surface !== 'mobile.shift_login' && surface !== 'mobile.shift_handoff') return null

  return (
    <>
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Live Tier B shift controls
            </Text>
            <Text variant="titleMedium">
              {branchName ?? 'Current branch'} · {cashierCode ?? 'No cashier code'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Writes are local-first in SQLite. Remote sync for shift sessions lands after the sync
              contract is extended beyond sales and inventory deltas.
            </Text>
          </View>

          {openShift && summary ? (
            <>
              <SummaryTiles shift={openShift} summary={summary} />
              {surface === 'mobile.shift_handoff' ? (
                <View style={{ gap: 10 }}>
                  <TextInput
                    mode="outlined"
                    label="Counted cash"
                    value={countedCash}
                    onChangeText={setCountedCash}
                    keyboardType="numeric"
                  />
                  <TextInput
                    mode="outlined"
                    label="Handoff note"
                    value={handoffNote}
                    onChangeText={setHandoffNote}
                    multiline
                  />
                  <Button mode="contained" loading={busy} disabled={busy} onPress={onClose}>
                    Close shift
                  </Button>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Shift is open. Continue selling, or open the handoff surface to close the
                    drawer.
                  </Text>
                  <Button mode="outlined" disabled={busy} onPress={() => void refresh()}>
                    Refresh shift totals
                  </Button>
                </View>
              )}
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput
                mode="outlined"
                label="Opening cash"
                value={openingCash}
                onChangeText={setOpeningCash}
                keyboardType="numeric"
              />
              <Button mode="contained" loading={busy} disabled={busy} onPress={onStart}>
                Start shift
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={3500}>
        {message}
      </Snackbar>
    </>
  )
}
