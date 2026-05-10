'use client'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-4 px-5 py-10">
      <p className="m-0 text-sm font-semibold uppercase text-danger-500">Marketing site error</p>
      <h1 className="m-0 text-3xl font-semibold text-ink-900">Something interrupted this page.</h1>
      <p className="m-0 text-sm text-ink-600">
        This scaffold keeps the public site recoverable while the final launch pages are still being
        assembled.
      </p>
      <button
        type="button"
        onClick={reset}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Try again
      </button>
    </main>
  )
}
