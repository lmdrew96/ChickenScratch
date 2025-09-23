'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Chicken Scratch ran into an error</h2>
      <pre className="mt-3 whitespace-pre-wrap text-sm opacity-80">{error.message}</pre>
      <button className="btn btn-accent mt-4" onClick={() => reset()}>Try again</button>
    </div>
  )
}
