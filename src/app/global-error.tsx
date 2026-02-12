'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="p-6">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-3 text-sm opacity-80">Something unexpected happened. Please try again.</p>
          {error.digest && (
            <p className="mt-1 text-xs opacity-50">Error ID: {error.digest}</p>
          )}
          <button className="btn btn-accent mt-4" onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
