'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationModal } from './delete-confirmation-modal';
import type { Submission } from '@/types/database';

interface SubmissionWithAuthor extends Submission {
  author_name?: string;
}

interface SubmissionsListWithDeleteProps {
  submissions: SubmissionWithAuthor[];
  isAdmin: boolean;
}

export function SubmissionsListWithDelete({
  submissions,
  isAdmin,
}: SubmissionsListWithDeleteProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithAuthor | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDeleteClick = (submission: SubmissionWithAuthor) => {
    setSelectedSubmission(submission);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubmission) return;

    console.log('[Delete] Calling API for submission:', selectedSubmission.id);

    try {
      const response = await fetch(`/api/submissions/${selectedSubmission.id}/delete`, {
        method: 'DELETE',
      });

      console.log('[Delete] API response status:', response.status);
      console.log('[Delete] API response ok:', response.ok);

      const data = await response.json();
      console.log('[Delete] API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete submission');
      }

      setToast({ message: 'Submission deleted successfully', type: 'success' });
      setDeleteModalOpen(false);
      setSelectedSubmission(null);

      // Refresh the page to update the list
      console.log('[Delete] Refreshing page');
      router.refresh();
    } catch (error) {
      console.error('[Delete] Error deleting submission:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete submission',
        type: 'error',
      });
    }
  };

  // Helper function to format committee status
  function formatCommitteeStatus(status: Submission['committee_status']): string {
    if (!status) return 'New';
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper function to get status color
  function getStatusColor(status: Submission['committee_status']): string {
    const colors: Record<string, string> = {
      pending_coordinator: 'bg-yellow-900/60 text-yellow-100 border-yellow-500/70',
      with_coordinator: 'bg-blue-900/60 text-blue-100 border-blue-500/60',
      coordinator_approved: 'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
      coordinator_declined: 'bg-rose-900/60 text-rose-100 border-rose-500/70',
      with_proofreader: 'bg-purple-900/60 text-purple-100 border-purple-500/70',
      proofreader_committed: 'bg-indigo-900/60 text-indigo-100 border-indigo-500/70',
      with_lead_design: 'bg-pink-900/60 text-pink-100 border-pink-500/70',
      lead_design_committed: 'bg-cyan-900/60 text-cyan-100 border-cyan-500/70',
      with_editor_in_chief: 'bg-amber-900/60 text-amber-100 border-amber-500/70',
      published: 'bg-green-900/60 text-green-100 border-green-500/70',
    };
    return status ? colors[status] || 'bg-slate-800/70 text-slate-200 border-slate-500/50' : 'bg-slate-800/70 text-slate-200 border-slate-500/50';
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg border px-6 py-3 shadow-lg ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-green-900/90 text-green-100'
              : 'border-red-500/50 bg-red-900/90 text-red-100'
          }`}
        >
          <p className="font-medium">{toast.message}</p>
        </div>
      )}

      {/* Submissions list */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <h2 className="mb-6 text-xl font-semibold text-[var(--text)]">All Submissions</h2>
        
        {submissions.length === 0 ? (
          <p className="text-sm text-slate-400">No submissions yet</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--text)]">{submission.title}</p>
                    <p className="text-sm text-slate-300">
                      {submission.author_name || 'Anonymous'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(submission.committee_status)}`}
                      >
                        {formatCommitteeStatus(submission.committee_status)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {submission.type === 'writing' ? '📝 Writing' : '🎨 Visual Art'}
                      </span>
                      {submission.genre && (
                        <span className="text-xs text-slate-400">• {submission.genre}</span>
                      )}
                    </div>
                  </div>

                  {/* Delete button - only visible to admins */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteClick(submission)}
                      className="rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      title="Delete submission"
                      aria-label={`Delete submission: ${submission.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete confirmation modal */}
      {selectedSubmission && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedSubmission(null);
          }}
          onConfirm={handleDeleteConfirm}
          submissionTitle={selectedSubmission.title}
          submissionAuthor={selectedSubmission.author_name || 'Anonymous'}
          hasFile={!!selectedSubmission.file_url}
          hasGoogleDoc={!!selectedSubmission.google_docs_link}
        />
      )}
    </>
  );
}
