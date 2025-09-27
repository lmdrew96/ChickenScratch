'use client';

import { useState } from 'react';
import type { Submission } from '@/types/database';

interface KanbanBoardProps {
  userRole: string;
  submissions: Submission[];
}

interface KanbanColumn {
  id: string;
  title: string;
  submissions: Submission[];  
  canInteract: boolean;
}

export default function KanbanBoard({ userRole, submissions }: KanbanBoardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Define columns based on user role
  const getColumns = (): KanbanColumn[] => {
    switch (userRole) {
      case 'submissions_coordinator':
        return [
          {
            id: 'new',
            title: 'New Submissions',
            submissions: submissions.filter(s => s.committee_status === 'pending_coordinator'),
            canInteract: true
          },
          {
            id: 'reviewing', 
            title: 'Under Review',
            submissions: submissions.filter(s => s.committee_status === 'with_coordinator'),
            canInteract: true
          },
          {
            id: 'approved',
            title: 'Approved',
            submissions: submissions.filter(s => s.committee_status === 'coordinator_approved'),
            canInteract: false
          }
        ];

      case 'proofreader':
        return [
          {
            id: 'assigned',
            title: 'Assigned to Me',
            submissions: submissions.filter(s => 
              s.committee_status === 'with_proofreader' && s.type === 'writing'
            ),
            canInteract: true
          },
          {
            id: 'in_progress',
            title: 'In Progress', 
            submissions: submissions.filter(s => 
              s.google_docs_link && !s.proofreader_committed_at
            ),
            canInteract: true
          },
          {
            id: 'committed',
            title: 'Committed',
            submissions: submissions.filter(s => s.committee_status === 'proofreader_committed'),
            canInteract: false
          }
        ];

      case 'lead_design':
        return [
          {
            id: 'visual_assigned',
            title: 'Visual Art Assigned',
            submissions: submissions.filter(s => 
              s.committee_status === 'with_lead_design' && s.type === 'visual'
            ),
            canInteract: true
          },
          {
            id: 'proofread_assigned',
            title: 'From Proofreading',
            submissions: submissions.filter(s => s.committee_status === 'proofreader_committed'),
            canInteract: true
          },
          {
            id: 'in_canva',
            title: 'In Canva',
            submissions: submissions.filter(s => 
              s.lead_design_commit_link && !s.lead_design_committed_at
            ),
            canInteract: true
          },
          {
            id: 'committed',
            title: 'Committed',
            submissions: submissions.filter(s => s.committee_status === 'lead_design_committed'),
            canInteract: false
          }
        ];

      case 'editor_in_chief':
        return [
          {
            id: 'ready_for_review',
            title: 'Ready for Review',
            submissions: submissions.filter(s => s.committee_status === 'with_editor_in_chief'),
            canInteract: true
          },
          {
            id: 'approved',
            title: 'Approved',
            submissions: submissions.filter(s => s.committee_status === 'editor_approved'),
            canInteract: false
          },
          {
            id: 'declined',
            title: 'Declined',
            submissions: submissions.filter(s => s.committee_status === 'editor_declined'),
            canInteract: false
          }
        ];

      default:
        return [
          {
            id: 'all',
            title: 'All Submissions',
            submissions: submissions.filter(s => s.committee_status === 'final_committee_review'),
            canInteract: false
          }
        ];
    }
  };

  const columns = getColumns();

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const handleAction = async (submission: Submission, action: string) => {
    // TODO: Implement API calls for workflow actions
    console.log(`Action: ${action} on submission:`, submission.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">
            {userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Workflow
          </h2>
          <p className="text-sm text-slate-300">
            Manage submissions in your role-specific workflow
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <header className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide">
                {column.title}
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                {column.submissions.length}
              </span>
            </header>

            <div className="space-y-3">
              {column.submissions.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No submissions</p>
              ) : (
                column.submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                    onClick={() => handleSubmissionClick(submission)}
                  >
                    <h4 className="font-semibold text-[var(--text)] text-sm mb-1">
                      {submission.title}
                    </h4>
                    <p className="text-xs text-slate-300 mb-2">
                      {submission.type} • {submission.genre || 'No genre'}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {new Date(submission.created_at!).toLocaleDateString()}
                      </span>
                      {column.canInteract && (
                        <button
                          className="text-[var(--accent)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(submission, 'primary');
                          }}
                        >
                          Action
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg)] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                {selectedSubmission.title}
              </h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-white/80 mb-1">Type & Genre</dt>
                <dd className="text-sm text-white/70">
                  {selectedSubmission.type} • {selectedSubmission.genre || 'No genre specified'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-white/80 mb-1">Summary</dt>
                <dd className="text-sm text-white/70">
                  {selectedSubmission.summary || 'No summary provided.'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-white/80 mb-1">Content Warnings</dt>
                <dd className="text-sm text-white/70">
                  {selectedSubmission.content_warnings || '—'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-white/80 mb-1">Workflow Status</dt>
                <dd className="text-sm text-white/70">
                  {selectedSubmission.committee_status?.replace('_', ' ') || 'Pending'}
                </dd>
              </div>

              {/* Role-specific actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                {userRole === 'submissions_coordinator' && (
                  <>
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                      onClick={() => handleAction(selectedSubmission, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                      onClick={() => handleAction(selectedSubmission, 'decline')}
                    >
                      Decline
                    </button>
                  </>
                )}
                {userRole === 'proofreader' && (
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                    onClick={() => handleAction(selectedSubmission, 'open_docs')}
                  >
                    Open in Google Docs
                  </button>
                )}
                {userRole === 'lead_design' && (
                  <button
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                    onClick={() => handleAction(selectedSubmission, 'canva_link')}
                  >
                    Add Canva Link
                  </button>
                )}
                {userRole === 'editor_in_chief' && (
                  <>
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                      onClick={() => handleAction(selectedSubmission, 'final_approve')}
                    >
                      Final Approve
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                      onClick={() => handleAction(selectedSubmission, 'final_decline')}
                    >
                      Final Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}