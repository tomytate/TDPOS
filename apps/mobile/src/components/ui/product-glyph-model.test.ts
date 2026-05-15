import { describe, expect, test } from 'bun:test'

import {
  PRODUCT_IMAGE_CACHE_POLICY,
  getProductFallbackColor,
  getProductImageSource,
  getProductInitials,
} from './product-glyph-model'

describe('product glyph model', () => {
  test('pins product image cache policy for scroll profiling', () => {
    expect(PRODUCT_IMAGE_CACHE_POLICY).toBe('memory-disk')
  })

  test('normalizes optional image uris', () => {
    expect(getProductImageSource(' https://example.com/image.webp ')).toEqual({
      uri: 'https://example.com/image.webp',
    })
    expect(getProductImageSource('')).toBeNull()
    expect(getProductImageSource(null)).toBeNull()
  })

  test('uses deterministic category fallback colors and initials', () => {
    expect(getProductFallbackColor('cat-sachet')).toBe(getProductFallbackColor('cat-sachet'))
    expect(getProductInitials('Test Sachet')).toBe('TS')
    expect(getProductInitials('Mentos')).toBe('ME')
    expect(getProductInitials('  ')).toBe('TD')
  })
})
