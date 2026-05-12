import 'server-only'

function safeErrorKind(error: unknown): string {
  if (error instanceof Error) return error.name || 'Error'
  if (error === null) return 'null'

  return typeof error
}

export function warnSafe(
  scope: string,
  error: unknown,
  metadata: Record<string, string | number | boolean | null> = {},
): void {
  console.warn(scope, { ...metadata, error: safeErrorKind(error) })
}
