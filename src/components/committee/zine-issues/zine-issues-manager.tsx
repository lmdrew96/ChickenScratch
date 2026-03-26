'use client';

import { useState, useTransition, useRef } from 'react';
import { BookOpen, Pencil, Trash2, Eye, EyeOff, Plus, X, FileText, ExternalLink } from 'lucide-react';
import type { ZineIssue } from '@/types/database';

type FormState = {
  title: string;
  volume: string;
  issue_number: string;
  publish_date: string;
  is_published: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  volume: '',
  issue_number: '',
  publish_date: '',
  is_published: false,
};

function issueToForm(issue: ZineIssue): FormState {
  return {
    title: issue.title,
    volume: issue.volume?.toString() ?? '',
    issue_number: issue.issue_number?.toString() ?? '',
    publish_date: issue.publish_date
      ? new Date(issue.publish_date).toISOString().slice(0, 10)
      : '',
    is_published: issue.is_published ?? false,
  };
}

function formatMeta(issue: ZineIssue): string {
  return [
    issue.volume != null && `Vol. ${issue.volume}`,
    issue.issue_number != null && `Issue ${issue.issue_number}`,
    issue.publish_date &&
      new Date(issue.publish_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
  ]
    .filter(Boolean)
    .join(' · ');
}

type Props = { initialIssues: ZineIssue[] };

export default function ZineIssuesManager({ initialIssues }: Props) {
  const [issues, setIssues] = useState<ZineIssue[]>(initialIssues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPdfFile(null);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(issue: ZineIssue) {
    setEditingId(issue.id);
    setForm(issueToForm(issue));
    setPdfFile(null);
    setError(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPdfFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function buildFormData(id?: string): FormData {
    const fd = new FormData();
    if (id) fd.append('id', id);
    fd.append('title', form.title);
    if (form.volume) fd.append('volume', form.volume);
    if (form.issue_number) fd.append('issue_number', form.issue_number);
    if (form.publish_date) fd.append('publish_date', new Date(form.publish_date).toISOString());
    fd.append('is_published', String(form.is_published));
    if (pdfFile) fd.append('pdf', pdfFile);
    return fd;
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch('/api/zine-issues', {
      method: 'POST',
      body: buildFormData(),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create issue.');
      return;
    }
    setIssues(prev => [data.issue, ...prev]);
    closeForm();
  }

  async function handleUpdate() {
    if (!editingId) return;
    setError(null);
    const res = await fetch('/api/zine-issues', {
      method: 'PATCH',
      body: buildFormData(editingId),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to update issue.');
      return;
    }
    setIssues(prev => prev.map(i => (i.id === editingId ? data.issue : i)));
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue? This cannot be undone.')) return;
    setError(null);
    const res = await fetch(`/api/zine-issues?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete issue.');
      return;
    }
    setIssues(prev => prev.filter(i => i.id !== id));
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[var(--text)] placeholder-slate-500 focus:border-[var(--accent)] focus:outline-none';

  // Find current issue's pdf_url for display in edit mode
  const editingIssue = editingId ? issues.find(i => i.id === editingId) : null;

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div ref={formRef} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {editingId ? 'Edit Issue' : 'New Issue'}
            </h2>
            <button type="button" onClick={closeForm} className="btn" aria-label="Cancel">
              <X size={16} />
              Cancel
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Spring 2026 Issue"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Volume</label>
                <input
                  type="number"
                  min="1"
                  value={form.volume}
                  onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Issue Number</label>
                <input
                  type="number"
                  min="1"
                  value={form.issue_number}
                  onChange={e => setForm(f => ({ ...f, issue_number: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Publish Date</label>
              <input
                type="date"
                value={form.publish_date}
                onChange={e => setForm(f => ({ ...f, publish_date: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                PDF File {editingId ? '(leave blank to keep existing)' : '*'}
              </label>

              {editingIssue?.pdf_url && (
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <FileText size={14} />
                  <span>Current:</span>
                  <a
                    href={editingIssue.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    View PDF <ExternalLink size={12} />
                  </a>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:text-[var(--text)] hover:file:bg-white/20"
              />
              {pdfFile && (
                <p className="mt-1 text-xs text-slate-400">
                  Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">Max 50 MB. PDF only.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_published"
                type="checkbox"
                checked={form.is_published}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 accent-[var(--accent)]"
              />
              <label htmlFor="is_published" className="cursor-pointer text-sm font-medium text-slate-300">
                Published (visible on public issues page)
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => startTransition(() => { void (editingId ? handleUpdate() : handleCreate()); })}
              disabled={isPending || !form.title.trim() || (!editingId && !pdfFile)}
              className="btn btn-accent"
            >
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Issue'}
            </button>
          </div>
        </div>
      )}

      {/* Issue list */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
            <BookOpen size={18} />
            All Issues ({issues.length})
          </h2>
          {!showForm && (
            <button type="button" onClick={openNewForm} className="btn btn-accent">
              <Plus size={16} />
              New Issue
            </button>
          )}
        </div>

        {issues.length === 0 ? (
          <p className="text-sm text-slate-400">No issues yet. Click &ldquo;New Issue&rdquo; to add one.</p>
        ) : (
          <ul className="space-y-4">
            {issues.map(issue => (
              <li key={issue.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--text)]">{issue.title}</span>
                      {issue.is_published ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
                          <Eye size={10} /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/30 bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-400">
                          <EyeOff size={10} /> Draft
                        </span>
                      )}
                    </div>
                    {formatMeta(issue) && (
                      <p className="text-sm text-slate-400">{formatMeta(issue)}</p>
                    )}
                    {issue.pdf_url ? (
                      <a
                        href={issue.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                      >
                        <FileText size={12} /> View PDF <ExternalLink size={10} />
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500">No PDF uploaded</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(issue)}
                      className="btn"
                      aria-label={`Edit ${issue.title}`}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(issue.id)}
                      className="btn border-red-400/30 text-red-300 hover:bg-red-500/10"
                      aria-label={`Delete ${issue.title}`}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
