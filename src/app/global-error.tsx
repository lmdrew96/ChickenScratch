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
          <pre className="mt-3 whitespace-pre-wrap text-sm opacity-80">{error.message}</pre>
          <button className="btn btn-accent mt-4" onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
