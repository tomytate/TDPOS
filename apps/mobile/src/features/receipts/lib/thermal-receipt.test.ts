import { describe, expect, test } from 'bun:test'

import { formatThermalMoney, formatThermalReceipt } from './thermal-receipt'

describe('thermal receipt formatter', () => {
  test('renders a 32-column BIR-ready receipt without peso-symbol encoding risk', () => {
    const receipt = formatThermalReceipt({
      storeName: 'TD POS Pilot Store',
      storeAddress: 'Quezon City',
      tin: '123-456-789-000',
      receiptNumber: 'QC01-C01-20260514-000001',
      total: 29,
      tendered: 50,
      change: 21,
      paymentMethod: 'cash',
      isUtang: false,
      items: [
        {
          name: 'Palmolive Sachet',
          qty: 3,
          wasSoldAs: 'piece',
          unitPrice: 7,
          lineTotal: 21,
        },
        {
          name: 'Nescafe 3in1',
          qty: 1,
          wasSoldAs: 'piece',
          unitPrice: 8,
          lineTotal: 8,
        },
      ],
      createdAt: new Date('2026-05-14T10:15:30+08:00').getTime(),
    })

    expect(receipt).toContain('PROVISIONAL RECEIPT')
    expect(receipt).toContain('QC01-C01-20260514-000001')
    expect(receipt).toContain('3x Palmolive')
    expect(receipt).toContain('TOTAL')
    expect(receipt).toContain('PHP 29.00')
    expect(receipt).toContain('BIR-ready receipt format')
    expect(receipt).not.toContain('₱')
    expect(
      receipt
        .split('\n')
        .filter(Boolean)
        .every((line) => line.length <= 32),
    ).toBe(true)
  })

  test('prints void references without mutating the original receipt wording', () => {
    const receipt = formatThermalReceipt({
      storeName: 'TD POS Store',
      storeAddress: '',
      tin: '',
      receiptNumber: 'QC01-C01-20260514-000002',
      status: 'voided',
      voidedOriginalReceiptNumber: 'QC01-C01-20260514-000001',
      total: -29,
      tendered: 0,
      change: 0,
      paymentMethod: 'cash',
      isUtang: false,
      items: [
        {
          name: 'Palmolive Sachet',
          qty: 3,
          wasSoldAs: 'piece',
          unitPrice: 7,
          lineTotal: -21,
        },
      ],
      createdAt: Date.UTC(2026, 4, 14, 2, 15, 30),
    })

    expect(receipt).toContain('VOID of:')
    expect(receipt).toContain('QC01-C01-20260514-000001')
    expect(receipt).toContain('VOID')
    expect(receipt).toContain('-PHP 29.00')
  })

  test('formats thermal money as ASCII PHP amounts', () => {
    expect(formatThermalMoney(7)).toBe('PHP 7.00')
    expect(formatThermalMoney(-7)).toBe('-PHP 7.00')
  })
})
