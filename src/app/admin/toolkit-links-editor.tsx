'use client';

import { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { officerToolkits } from '@/lib/data/toolkits';

type Props = {
  initialConfig: Record<string, string>;
};

export default function ToolkitLinksEditor({ initialConfig }: Props) {
  // Extract all the configKeys from toolkits data
  const allKeys = officerToolkits.flatMap((t) => t.quickLinks.map((l) => l.configKey));
  
  // Initialize state with all the keys
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const initialState: Record<string, string> = {};
    for (const key of allKeys) {
      initialState[key] = initialConfig[key] ?? '';
    }
    return initialState;
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const handleUpdate = (key: string, value: string) => {
    setLinks((prev) => ({ ...prev, [key]: value }));
  };

  async function save() {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(links),
      });
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
        <LinkIcon className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="text-xl font-bold text-white">Officer Toolkit URLs</h2>
      </div>

      <div className="space-y-8">
        {officerToolkits.map((toolkit) => {
          if (toolkit.quickLinks.length === 0) return null;

          return (
            <div key={toolkit.slug} className="space-y-4">
              <h3 className="font-semibold text-white border-b border-white/5 pb-2 text-lg flex items-center justify-between">
                {toolkit.roleName} <span className="text-sm font-normal text-slate-400">({toolkit.title})</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolkit.quickLinks.map((link) => (
                  <div key={link.configKey}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {link.label}
                    </label>
                    <input
                      type="url"
                      value={links[link.configKey] ?? ''}
                      onChange={(e) => handleUpdate(link.configKey, e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-opacity"
          >
            {saving ? 'Saving...' : 'Save URLs'}
          </button>
          {status === 'ok' && (
            <span className="text-sm text-green-400">URLs saved successfully.</span>
          )}
          {status === 'error' && (
            <span className="text-sm text-red-400">Failed to save URLs. Please try again.</span>
          )}
        </div>
      </div>
    </div>
  );
}
