export type PerformanceMetricName =
  | 'app_root_mount_ms'
  | 'sale_screen_first_render_ms'
  | 'add_to_cart_handler_ms'
  | 'checkout_commit_ms'
  | 'sync_cycle_ms'

export interface PerformanceMetric {
  name: PerformanceMetricName
  durationMs: number
  budgetMs: number
  recordedAt: string
}

export interface PerformanceMetricSummary extends PerformanceMetric {
  status: 'pass' | 'warn' | 'fail'
}

interface PerformanceStorage {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  remove?(key: string): void
}

const PERFORMANCE_KEY = 'tdpos.performance.metrics.v1'
const MAX_METRICS_PER_NAME = 20

export const PERFORMANCE_BUDGETS_MS: Record<PerformanceMetricName, number> = {
  app_root_mount_ms: 2_500,
  sale_screen_first_render_ms: 1_500,
  add_to_cart_handler_ms: 100,
  checkout_commit_ms: 250,
  sync_cycle_ms: 30_000,
}

const appStartedAt = Date.now()
let rootMountRecorded = false
let saleScreenFirstRenderRecorded = false

function nowMs() {
  return Date.now()
}

function metricStatus(durationMs: number, budgetMs: number): PerformanceMetricSummary['status'] {
  if (durationMs <= budgetMs) return 'pass'
  if (durationMs <= budgetMs * 1.25) return 'warn'
  return 'fail'
}

function parseMetrics(raw: string | undefined): PerformanceMetric[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((item): PerformanceMetric[] => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.name !== 'string' ||
        typeof item.durationMs !== 'number' ||
        typeof item.budgetMs !== 'number' ||
        typeof item.recordedAt !== 'string' ||
        !(item.name in PERFORMANCE_BUDGETS_MS)
      ) {
        return []
      }

      return [
        {
          name: item.name as PerformanceMetricName,
          durationMs: Math.max(0, Math.round(item.durationMs)),
          budgetMs: Math.max(1, Math.round(item.budgetMs)),
          recordedAt: item.recordedAt,
        },
      ]
    })
  } catch {
    return []
  }
}

function serializeMetrics(metrics: PerformanceMetric[]): string {
  return JSON.stringify(metrics)
}

export function getPerformanceMetrics(metricStorage: PerformanceStorage): PerformanceMetric[] {
  return parseMetrics(metricStorage.getString(PERFORMANCE_KEY))
}

export function getLatestPerformanceMetrics(
  metricStorage: PerformanceStorage,
): PerformanceMetricSummary[] {
  const latest = new Map<PerformanceMetricName, PerformanceMetric>()

  for (const metric of getPerformanceMetrics(metricStorage)) {
    const existing = latest.get(metric.name)
    if (!existing || existing.recordedAt <= metric.recordedAt) latest.set(metric.name, metric)
  }

  return [...latest.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((metric) => ({
      ...metric,
      status: metricStatus(metric.durationMs, metric.budgetMs),
    }))
}

export function clearPerformanceMetrics(metricStorage: PerformanceStorage): void {
  if (metricStorage.remove) {
    metricStorage.remove(PERFORMANCE_KEY)
    return
  }

  metricStorage.set(PERFORMANCE_KEY, '[]')
}

export function recordPerformanceDuration(
  name: PerformanceMetricName,
  durationMs: number,
  metricStorage: PerformanceStorage,
): PerformanceMetric {
  const metric: PerformanceMetric = {
    name,
    durationMs: Math.max(0, Math.round(durationMs)),
    budgetMs: PERFORMANCE_BUDGETS_MS[name],
    recordedAt: new Date().toISOString(),
  }
  const metrics = [...getPerformanceMetrics(metricStorage), metric]
  const trimmed = metrics.filter((item) => {
    if (item.name !== name) return true
    const sameName = metrics.filter((candidate) => candidate.name === name)
    return sameName.indexOf(item) >= sameName.length - MAX_METRICS_PER_NAME
  })

  metricStorage.set(PERFORMANCE_KEY, serializeMetrics(trimmed))
  return metric
}

export function startPerformanceTimer(
  name: PerformanceMetricName,
  metricStorage: PerformanceStorage,
  startedAtMs = nowMs(),
) {
  return () => recordPerformanceDuration(name, nowMs() - startedAtMs, metricStorage)
}

export function recordAppRootMounted(metricStorage: PerformanceStorage): void {
  if (rootMountRecorded) return
  rootMountRecorded = true
  recordPerformanceDuration('app_root_mount_ms', nowMs() - appStartedAt, metricStorage)
}

export function recordSaleScreenFirstRender(metricStorage: PerformanceStorage): void {
  if (saleScreenFirstRenderRecorded) return
  saleScreenFirstRenderRecorded = true
  recordPerformanceDuration('sale_screen_first_render_ms', nowMs() - appStartedAt, metricStorage)
}
