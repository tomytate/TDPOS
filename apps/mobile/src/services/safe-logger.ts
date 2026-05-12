// Minimal production-safe logger.
// Keep support logs useful while avoiding raw Error objects/messages that can
// accidentally include phone numbers, customer names, SQL payloads, or queue
// contents.

function safeErrorKind(error: unknown): string {
  if (error instanceof Error) return error.name || 'Error'
  if (error === null) return 'null'
  return typeof error
}

export function warnSafe(scope: string, error: unknown) {
  if (typeof console === 'undefined') return
  console.warn(scope, { error: safeErrorKind(error) })
}
