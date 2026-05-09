import { describe, expect, test } from 'bun:test'

import { amber, categoryBg, ink, semantic, teal } from './colors'

describe('TD POS color tokens', () => {
  test('keeps teal as the primary brand family', () => {
    expect(teal[700]).toBe('#0f766e')
    expect(teal[800]).toBe('#115e59')
  })

  test('keeps amber as the action accent family', () => {
    expect(amber[500]).toBe('#f59e0b')
  })

  test('keeps neutral and semantic tokens available for MD3 themes', () => {
    expect(ink[900]).toBe('#1c1917')
    expect(semantic.green500).toBe('#22c55e')
    expect(semantic.red500).toBe('#ef4444')
  })

  test('keeps category fallback colors defined for product glyphs', () => {
    expect(categoryBg.sachet).toBeTruthy()
    expect(categoryBg.drink).toBeTruthy()
  })
})
