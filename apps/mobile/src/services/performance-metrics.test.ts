import { describe, expect, test } from 'bun:test'

import {
  clearPerformanceMetrics,
  getLatestPerformanceMetrics,
  getPerformanceMetrics,
  recordPerformanceDuration,
  startPerformanceTimer,
} from './performance-metrics'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => {
      values.set(key, value)
    },
    remove: (key: string) => {
      values.delete(key)
    },
  }
}

describe('performance metrics', () => {
  test('records durations with budgets and latest status', () => {
    const storage = memoryStorage()

    recordPerformanceDuration('checkout_commit_ms', 180, storage)
    recordPerformanceDuration('checkout_commit_ms', 280, storage)
    recordPerformanceDuration('add_to_cart_handler_ms', 40, storage)
    recordPerformanceDuration('receipt_screen_render_ms', 900, storage)

    expect(getPerformanceMetrics(storage)).toHaveLength(4)
    expect(getLatestPerformanceMetrics(storage)).toEqual([
      expect.objectContaining({
        name: 'add_to_cart_handler_ms',
        durationMs: 40,
        budgetMs: 100,
        status: 'pass',
      }),
      expect.objectContaining({
        name: 'checkout_commit_ms',
        durationMs: 280,
        budgetMs: 250,
        status: 'warn',
      }),
      expect.objectContaining({
        name: 'receipt_screen_render_ms',
        durationMs: 900,
        budgetMs: 1000,
        status: 'pass',
      }),
    ])
  })

  test('ignores corrupted persisted metrics and can clear the store', () => {
    const storage = memoryStorage()
    storage.set('tdpos.performance.metrics.v1', '{not-json')

    expect(getPerformanceMetrics(storage)).toEqual([])

    recordPerformanceDuration('sync_cycle_ms', 31_000, storage)
    expect(getLatestPerformanceMetrics(storage)[0]?.status).toBe('warn')

    clearPerformanceMetrics(storage)
    expect(getPerformanceMetrics(storage)).toEqual([])
  })

  test('startPerformanceTimer writes elapsed time using the provided storage', () => {
    const storage = memoryStorage()
    const stop = startPerformanceTimer('checkout_commit_ms', storage, Date.now() - 42)

    const metric = stop()

    expect(metric.name).toBe('checkout_commit_ms')
    expect(metric.durationMs).toBeGreaterThanOrEqual(40)
    expect(getPerformanceMetrics(storage)).toHaveLength(1)
  })
})
