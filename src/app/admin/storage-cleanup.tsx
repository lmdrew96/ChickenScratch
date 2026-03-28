'use client'

import { useState } from 'react'
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react'

type OrphanedFile = {
  key: string
  bucket: string
  size: number
  lastModified: string
}

type ScanResult = {
  orphaned: OrphanedFile[]
  totalBytes: number
  scannedCount: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileId(f: OrphanedFile): string {
  return `${f.bucket}:${f.key}`
}

export default function StorageCleanup() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function scan() {
    setScanning(true)
    setError(null)
    setResult(null)
    setSelected(new Set())
    setConfirmDelete(false)
    try {
      const res = await fetch('/api/admin/storage-cleanup')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Scan failed (${res.status})`)
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  function toggleAll(checked: boolean) {
    if (checked && result) {
      setSelected(new Set(result.orphaned.map(fileId)))
    } else {
      setSelected(new Set())
    }
  }

  function toggleFile(f: OrphanedFile) {
    const id = fileId(f)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    setConfirmDelete(false)
    try {
      const files = [...selected].map((id) => {
        const colonIdx = id.indexOf(':')
        return {
          bucket: id.slice(0, colonIdx),
          key: id.slice(colonIdx + 1),
        }
      })

      const res = await fetch('/api/admin/storage-cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }

      // Remove deleted files from results
      setResult((prev) => {
        if (!prev) return null
        const remaining = prev.orphaned.filter((f) => !selected.has(fileId(f)))
        return {
          ...prev,
          orphaned: remaining,
          totalBytes: remaining.reduce((s, f) => s + f.size, 0),
        }
      })
      setSelected(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const allSelected = result !== null && result.orphaned.length > 0 && selected.size === result.orphaned.length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-xl font-bold text-white">Storage Cleanup</h2>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Scan Storage'}
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Finds files in R2 storage that are no longer linked to any submission. These are safe to delete.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div>
          <p className="text-sm text-gray-400 mb-3">
            Scanned <strong className="text-white">{result.scannedCount}</strong> files.{' '}
            {result.orphaned.length === 0 ? (
              <span className="text-green-400">No orphaned files found.</span>
            ) : (
              <>
                Found <strong className="text-white">{result.orphaned.length}</strong> orphaned file
                {result.orphaned.length !== 1 ? 's' : ''} totalling{' '}
                <strong className="text-white">{formatBytes(result.totalBytes)}</strong>.
              </>
            )}
          </p>

          {result.orphaned.length > 0 && (
            <>
              <div className="rounded-lg border border-white/10 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="w-10 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-gray-300 font-medium">Path</th>
                      <th className="px-4 py-2 text-left text-gray-300 font-medium">Bucket</th>
                      <th className="px-4 py-2 text-right text-gray-300 font-medium">Size</th>
                      <th className="px-4 py-2 text-right text-gray-300 font-medium">Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.orphaned.map((f) => {
                      const id = fileId(f)
                      return (
                        <tr
                          key={id}
                          className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer"
                          onClick={() => toggleFile(f)}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(id)}
                              onChange={() => toggleFile(f)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-2 text-gray-300 font-geist-mono text-xs truncate max-w-[300px]">
                            {f.key}
                          </td>
                          <td className="px-4 py-2 text-gray-400">{f.bucket}</td>
                          <td className="px-4 py-2 text-right text-gray-400">{formatBytes(f.size)}</td>
                          <td className="px-4 py-2 text-right text-gray-400">
                            {new Date(f.lastModified).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={deleteSelected}
                  disabled={selected.size === 0 || deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting
                    ? 'Deleting...'
                    : confirmDelete
                    ? `Confirm delete ${selected.size} file${selected.size !== 1 ? 's' : ''}?`
                    : `Delete ${selected.size} selected`}
                </button>
                {confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {selected.size > 0 && !confirmDelete && (
                  <span className="text-sm text-gray-400">
                    {formatBytes(result.orphaned.filter((f) => selected.has(fileId(f))).reduce((s, f) => s + f.size, 0))} selected
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
