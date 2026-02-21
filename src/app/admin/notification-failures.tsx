'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

type Failure = {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  error_message: string;
  context: Record<string, unknown> | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  committee: 'Committee',
  author_status: 'Author Status',
  officer: 'Officer',
  reminder: 'Reminder',
  contact: 'Contact',
};

export default function NotificationFailures({ initialFailures }: { initialFailures: Failure[] }) {
  const [failures, setFailures] = useState(initialFailures);
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      const res = await fetch(`/api/admin/notification-failures`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setFailures((prev) => prev.filter((f) => f.id !== id));
      }
    } finally {
      setDismissing(null);
    }
  }

  async function dismissAll() {
    setDismissing('all');
    try {
      const res = await fetch(`/api/admin/notification-failures`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setFailures([]);
      }
    } finally {
      setDismissing(null);
    }
  }

  if (failures.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Email Failures</h3>
        <p className="text-sm text-gray-400">No recent email failures.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Email Failures{' '}
          <span className="text-sm font-normal text-red-400">({failures.length})</span>
        </h3>
        <button
          onClick={dismissAll}
          disabled={dismissing === 'all'}
          className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Dismiss all
        </button>
      </div>

      <div className="space-y-3">
        {failures.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                    {TYPE_LABELS[f.type] || f.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate">{f.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">To: {f.recipient}</p>
                <p className="text-xs text-red-400 mt-1 font-mono break-all">{f.error_message}</p>
              </div>
              <button
                onClick={() => dismiss(f.id)}
                disabled={dismissing === f.id}
                className="shrink-0 p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Dismiss"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
