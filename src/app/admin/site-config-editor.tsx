'use client'

import { useState, useRef } from 'react'
import { Settings, Plus, X } from 'lucide-react'

type Props = {
  initialConfig: Record<string, string>
}

function parsePositions(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
  } catch {
    // ignore
  }
  return []
}

function PositionTagInput({
  label,
  positions,
  onChange,
}: {
  label: string
  positions: string[]
  onChange: (positions: string[]) => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addPosition() {
    const trimmed = input.trim()
    if (!trimmed || positions.includes(trimmed)) return
    onChange([...positions, trimmed])
    setInput('')
    inputRef.current?.focus()
  }

  function removePosition(pos: string) {
    onChange(positions.filter((p) => p !== pos))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
        {positions.map((pos) => (
          <span
            key={pos}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-sm text-white"
          >
            {pos}
            <button
              type="button"
              onClick={() => removePosition(pos)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={`Remove ${pos}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {positions.length === 0 && (
          <span className="text-sm text-gray-500 italic">No positions configured — using defaults</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addPosition()
            }
          }}
          placeholder="Add a position..."
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        <button
          type="button"
          onClick={addPosition}
          disabled={!input.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  )
}

export default function SiteConfigEditor({ initialConfig }: Props) {
  const [officerPositions, setOfficerPositions] = useState<string[]>(
    parsePositions(initialConfig.officer_positions)
  )
  const [committeePositions, setCommitteePositions] = useState<string[]>(
    parsePositions(initialConfig.committee_positions)
  )
  const [discordUrl, setDiscordUrl] = useState(initialConfig.discord_webhook_url ?? '')
  const [recipients, setRecipients] = useState(initialConfig.contact_form_recipients ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  async function save() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_positions: JSON.stringify(officerPositions),
          committee_positions: JSON.stringify(committeePositions),
          discord_webhook_url: discordUrl,
          contact_form_recipients: recipients,
        }),
      })
      setStatus(res.ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="text-xl font-bold text-white">Site Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PositionTagInput
            label="Officer Positions"
            positions={officerPositions}
            onChange={setOfficerPositions}
          />
          <PositionTagInput
            label="Committee Positions"
            positions={committeePositions}
            onChange={setCommitteePositions}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Discord Webhook URL
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Overrides the <code className="text-gray-400">DISCORD_WEBHOOK_URL</code> environment variable. Leave blank to use the env var.
          </p>
          <input
            type="url"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contact Form Recipients
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Comma-separated email addresses. Overrides <code className="text-gray-400">CONTACT_FORM_RECIPIENTS</code> env var.
          </p>
          <textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="officer@example.com, another@example.com"
            rows={2}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-opacity"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {status === 'ok' && (
            <span className="text-sm text-green-400">Settings saved.</span>
          )}
          {status === 'error' && (
            <span className="text-sm text-red-400">Failed to save. Please try again.</span>
          )}
        </div>
      </div>
    </div>
  )
}
