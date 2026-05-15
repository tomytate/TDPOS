import { describe, expect, test } from 'bun:test'

import {
  createClientOperationId,
  displayStock,
  formatMoney,
  formatReceiptDate,
  generateReceiptNumber,
  getDeviceHeartbeatFreshness,
  isValidDevicePairingCode,
  isValidPhPhone,
  isValidReceiptNumber,
  normalizeDevicePairingCode,
  normalizePhPhone,
  piecesForSaleUnit,
  splitStock,
} from './index'

describe('money formatting', () => {
  test('formats Philippine peso values with two decimals', () => {
    expect(formatMoney(1234.5)).toBe('₱1,234.50')
  })
})

describe('device heartbeat freshness', () => {
  const now = new Date('2026-05-13T12:00:00.000Z')

  test('classifies active devices by the shared 15-minute cadence thresholds', () => {
    expect(
      getDeviceHeartbeatFreshness({
        status: 'active',
        lastSeenAt: '2026-05-13T11:30:01.000Z',
        now,
      }),
    ).toBe('fresh')
    expect(
      getDeviceHeartbeatFreshness({
        status: 'active',
        lastSeenAt: '2026-05-13T11:15:00.000Z',
        now,
      }),
    ).toBe('stale')
    expect(
      getDeviceHeartbeatFreshness({
        status: 'active',
        lastSeenAt: '2026-05-12T12:00:00.000Z',
        now,
      }),
    ).toBe('offline')
  })

  test('keeps explicit lifecycle statuses separate from heartbeat age', () => {
    expect(getDeviceHeartbeatFreshness({ status: 'lost', lastSeenAt: null, now })).toBe('lost')
    expect(getDeviceHeartbeatFreshness({ status: 'inactive', lastSeenAt: null, now })).toBe(
      'inactive',
    )
    expect(getDeviceHeartbeatFreshness({ status: 'active', lastSeenAt: null, now })).toBe('never')
  })
})

describe('device pairing code helpers', () => {
  test('normalizes codes to uppercase alphanumeric', () => {
    expect(normalizeDevicePairingCode('ab12-cd34')).toBe('AB12CD34')
  })

  test('validates short-lived code length after normalization', () => {
    expect(isValidDevicePairingCode('AB12-CD34')).toBe(true)
    expect(isValidDevicePairingCode('AB12')).toBe(false)
    expect(isValidDevicePairingCode('A'.repeat(17))).toBe(false)
  })
})

describe('canonical pieces inventory math', () => {
  test('splits stock pieces into packs and loose pieces', () => {
    expect(splitStock(29, 12)).toEqual({ packs: 2, loosePieces: 5 })
  })

  test('never returns fractional or negative display stock', () => {
    expect(splitStock(-5.7, 12.4)).toEqual({ packs: 0, loosePieces: 0 })
  })

  test('renders derived pack and piece labels', () => {
    expect(displayStock(13, 12, 'sachet')).toBe('1 pack + 1 sachet')
    expect(displayStock(29, 12, 'sachet')).toBe('2 packs + 5 sachets')
  })

  test('converts piece and pack sales into canonical pieces', () => {
    expect(piecesForSaleUnit(7, 'piece', 12)).toBe(7)
    expect(piecesForSaleUnit(2, 'pack', 12)).toBe(24)
  })
})

describe('receipt numbering', () => {
  test('generates offline-safe receipt numbers with a padded sequence', () => {
    expect(generateReceiptNumber('MNL01', 'C01', '20260509', 42)).toBe('MNL01-C01-20260509-000042')
  })

  test('validates the receipt namespace format', () => {
    expect(isValidReceiptNumber('MNL01-C01-20260509-000042')).toBe(true)
    expect(isValidReceiptNumber('MNL01-20260509-000042')).toBe(false)
  })
})

describe('Philippine phone helpers', () => {
  test('normalizes local phone formats to +63', () => {
    expect(normalizePhPhone('0917 123 4567')).toBe('+639171234567')
    expect(normalizePhPhone('639171234567')).toBe('+639171234567')
  })

  test('validates Philippine mobile numbers', () => {
    expect(isValidPhPhone('0917 123 4567')).toBe(true)
    expect(isValidPhPhone('+63721234567')).toBe(false)
  })
})

describe('client operation id', () => {
  test('produces an RFC 4122 v4 UUID', () => {
    const id = createClientOperationId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  test('produces unique ids on repeated calls', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 32; i += 1) ids.add(createClientOperationId())
    expect(ids.size).toBe(32)
  })
})

describe('receipt date formatting', () => {
  test('produces YYYYMMDD using local date components', () => {
    const date = new Date(2026, 4, 9)
    expect(formatReceiptDate(date)).toBe('20260509')
  })

  test('zero-pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5)
    expect(formatReceiptDate(date)).toBe('20260105')
  })
})
