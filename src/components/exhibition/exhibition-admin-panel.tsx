'use client';

import { useState } from 'react';
import type { ExhibitionSubmission } from '@/types/database';
import { parseConfigDate } from '@/lib/utils';

interface OwnerMap {
  [id: string]: { name: string | null; full_name: string | null; email: string | null };
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  declined: 'bg-red-500/20 text-red-300',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-500/20 text-slate-300';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

interface ReviewModalProps {
  submission: ExhibitionSubmission;
  ownerMap: OwnerMap;
  onClose: () => void;
  onDecision: (id: string, status: 'approved' | 'declined', notes: string) => Promise<void>;
}

function ReviewModal({ submission: s, ownerMap, onClose, onDecision }: ReviewModalProps) {
  const [notes, setNotes] = useState(s.reviewer_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = ownerMap[s.owner_id];
  const ownerName = owner?.full_name || owner?.name || owner?.email || 'Unknown';

  const decide = async (status: 'approved' | 'declined') => {
    setSaving(true);
    setError(null);
    try {
      await onDecision(s.id, status, notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">{s.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-4 p-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="capitalize font-medium text-white">{s.type}</span>
            {s.medium && <span className="capitalize">{s.medium.replace(/_/g, ' ')}</span>}
            <span>By {ownerName}</span>
            {s.preferred_name && <span>Credit: {s.preferred_name}</span>}
            <StatusBadge status={s.status ?? 'submitted'} />
          </div>

          {/* Writing */}
          {s.type === 'writing' && s.text_body && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Writing</p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300 whitespace-pre-wrap">
                {s.text_body}
              </div>
              {s.word_count && <p className="text-xs text-slate-500">{s.word_count} words</p>}
            </div>
          )}

          {/* Visual art */}
          {s.type === 'visual' && s.file_url && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Artwork</p>
              {s.file_type?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/exhibition/admin/preview?path=${encodeURIComponent(s.file_url)}`}
                  alt={s.title}
                  className="max-h-72 rounded-lg object-contain"
                />
              ) : (
                <p className="text-sm text-slate-400">
                  File: {s.file_name ?? s.file_url}
                  {s.file_size && ` (${(s.file_size / 1024 / 1024).toFixed(2)} MB)`}
                </p>
              )}
              {s.display_format && (
                <p className="text-xs text-slate-400 capitalize">
                  Display: {s.display_format.replace(/_/g, ' ')}
                </p>
              )}
              {s.display_notes && (
                <p className="text-xs text-slate-400">Notes: {s.display_notes}</p>
              )}
            </div>
          )}

          {/* Description */}
          {s.description && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</p>
              <p className="text-sm text-slate-300">{s.description}</p>
            </div>
          )}

          {/* Artist statement */}
          {s.artist_statement && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Artist Statement</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{s.artist_statement}</p>
            </div>
          )}

          {/* Content warnings */}
          {s.content_warnings && (
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-300">
              ⚠️ Content warnings: {s.content_warnings}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1 text-xs text-slate-500">
            {s.created_at && <p>Submitted: {new Date(s.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>}
            {s.reviewed_at && <p>Reviewed: {new Date(s.reviewed_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>}
          </div>

          {/* Reviewer notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="reviewer_notes">
              Reviewer notes (optional)
            </label>
            <textarea
              id="reviewer_notes"
              rows={3}
              className="form-input w-full resize-none text-sm"
              placeholder="Any notes for the submitter…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Action buttons */}
          {s.status === 'submitted' ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => decide('approved')}
                className="btn btn-accent flex-1 disabled:opacity-50"
              >
                {saving ? 'Saving…' : '✓ Approve'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => decide('declined')}
                className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : '✗ Decline'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-400 text-center">
                This submission was <strong className="text-white">{s.status}</strong>.
                You can update the decision below.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => decide('approved')}
                  className="btn btn-accent flex-1 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : '✓ Approve'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => decide('declined')}
                  className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : '✗ Decline'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  initialSubmissions: ExhibitionSubmission[];
  ownerMap: OwnerMap;
  config: Record<string, string>;
}

export default function ExhibitionAdminPanel({ initialSubmissions, ownerMap, config }: Props) {
  const [submissions, setSubmissions] = useState<ExhibitionSubmission[]>(initialSubmissions);
  const [selected, setSelected] = useState<ExhibitionSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Config editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    submissions_open: config.submissions_open ?? 'true',
    submission_deadline: config.submission_deadline ?? '',
    exhibition_date: config.exhibition_date ?? '',
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'submitted').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    declined: submissions.filter((s) => s.status === 'declined').length,
  };

  const filtered = submissions.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    return true;
  });

  const handleDecision = async (id: string, status: 'approved' | 'declined', notes: string) => {
    const res = await fetch(`/api/exhibition/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_notes: notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Failed to save decision.');
    }
    const { submission } = await res.json() as { submission: ExhibitionSubmission };
    setSubmissions((prev) => prev.map((s) => (s.id === id ? submission : s)));
    if (selected?.id === id) setSelected(submission);
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigError(null);
    try {
      const res = await fetch('/api/exhibition/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? 'Failed to save config.');
      }
      setEditingConfig(false);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-300' },
          { label: 'Approved', value: stats.approved, color: 'text-green-300' },
          { label: 'Declined', value: stats.declined, color: 'text-red-300' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Config */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Exhibition Settings</h3>
          <button
            type="button"
            onClick={() => setEditingConfig(!editingConfig)}
            className="text-xs text-slate-400 hover:text-white"
          >
            {editingConfig ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingConfig ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-300">Submissions open</label>
              <select
                className="form-input text-sm"
                value={configForm.submissions_open}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, submissions_open: e.target.value }))}
              >
                <option value="true">Open</option>
                <option value="false">Closed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Submission deadline (ISO 8601)</label>
              <input
                type="text"
                className="form-input w-full text-sm"
                placeholder="e.g. 2026-04-18T23:59:59-04:00"
                value={configForm.submission_deadline}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, submission_deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Exhibition date</label>
              <input
                type="date"
                className="form-input w-full text-sm"
                value={configForm.exhibition_date}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, exhibition_date: e.target.value }))}
              />
            </div>
            {configError && <p className="text-xs text-red-400">{configError}</p>}
            <button
              type="button"
              disabled={configSaving}
              onClick={saveConfig}
              className="btn btn-accent text-sm disabled:opacity-50"
            >
              {configSaving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>
              Status:{' '}
              <strong className={config.submissions_open === 'false' ? 'text-red-300' : 'text-green-300'}>
                {config.submissions_open === 'false' ? 'Closed' : 'Open'}
              </strong>
            </span>
            {config.submission_deadline && (
              <span>
                Deadline:{' '}
                <strong className="text-white">
                  {parseConfigDate(config.submission_deadline).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
                  })}
                </strong>
              </span>
            )}
            {config.exhibition_date && (
              <span>
                Exhibition date:{' '}
                <strong className="text-white">
                  {parseConfigDate(config.exhibition_date).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
                  })}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="form-input text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="submitted">Pending review</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
        </select>
        <select
          className="form-input text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="writing">Writing</option>
          <option value="visual">Visual Art</option>
        </select>
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">No submissions match the current filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const owner = ownerMap[s.owner_id];
            const ownerName = owner?.full_name || owner?.name || owner?.email || 'Unknown';
            const date = s.created_at
              ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
              : '';
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-medium text-white">{s.title}</span>
                  <StatusBadge status={s.status ?? 'submitted'} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{ownerName}</span>
                  <span className="capitalize">{s.type}</span>
                  {s.medium && <span className="capitalize">{s.medium.replace(/_/g, ' ')}</span>}
                  {date && <span>{date}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <ReviewModal
          submission={selected}
          ownerMap={ownerMap}
          onClose={() => setSelected(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  );
}
