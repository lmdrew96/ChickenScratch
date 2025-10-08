'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/shell/page-header'

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Login page error:', error)
  }, [error])

  return (
    <div className="space-y-6">
      <PageHeader title="Login Error" />
      <div className="mx-auto mt-6 max-w-4xl">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 md:p-8 shadow-lg max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Something went wrong</h2>
          <p className="text-sm text-slate-300 mb-4">
            An error occurred while loading the login page. Please try again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="btn btn-accent"
            >
              Try again
            </button>
            <Link href="/" className="btn">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
