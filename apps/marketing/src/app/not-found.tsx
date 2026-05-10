import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-4 px-5 py-10">
      <p className="m-0 text-sm font-semibold uppercase text-teal-700">Page not found</p>
      <h1 className="m-0 text-3xl font-semibold text-ink-900">This page is not in the scaffold.</h1>
      <p className="m-0 text-sm text-ink-600">
        The marketing site is still in the M0 scaffold phase. Public launch pages will be finalized
        before the hidden-url review.
      </p>
      <Link
        href="/"
        className="w-fit rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Back to TD POS
      </Link>
    </main>
  )
}
