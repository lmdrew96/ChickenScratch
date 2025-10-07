'use client';

import { useState, useMemo } from 'react';
import { LoadingSpinner } from '@/components/shared/loading-states';
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
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter submissions based on search term
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm.trim()) return submissions;
    
    const term = searchTerm.toLowerCase();
    return submissions.filter(submission => 
      submission.title.toLowerCase().includes(term) ||
      submission.genre?.toLowerCase().includes(term) ||
      submission.type.toLowerCase().includes(term)
    );
  }, [submissions, searchTerm]);

  const columns = getColumns();

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const handleAction = async (submission: Submission, action: string) => {
    try {
      setIsProcessing(submission.id);
      
      let payload: any = {
        submissionId: submission.id,
        action: action === 'primary' ? getPrimaryAction(submission) : action,
      };

      // Handle specific actions
      if (action === 'open_docs' || action === 'canva_link') {
        const url = prompt(
          action === 'open_docs' 
            ? 'Enter Google Docs link:' 
            : 'Enter Canva share link:'
        );
        if (!url) {
          setIsProcessing(null);
          return;
        }
        payload.action = 'commit';
        payload.linkUrl = url;
      } else if (action === 'decline' || action === 'final_decline') {
        const comment = prompt('Enter decline reason (required):');
        if (!comment) {
          setIsProcessing(null);
          return;
        }
        payload.comment = comment;
        payload.action = action.includes('final') ? 'decline' : 'decline';
      }

      const response = await fetch('/api/committee-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process action');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Action failed:', error);
      alert(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(null);
    }
  };

  const getActionLabel = (role: string, submission: Submission): string => {
    switch (role) {
      case 'submissions_coordinator':
        return 'Review';
      case 'proofreader':
        return 'Edit Docs';
      case 'lead_design':
        return 'Add to Canva';
      case 'editor_in_chief':
        return 'Final Review';
      default:
        return 'View';
    }
  };

  const getPrimaryAction = (submission: Submission): string => {
    switch (userRole) {
      case 'submissions_coordinator':
        return 'approve';
      case 'proofreader':
        return 'commit';
      case 'lead_design':
        return 'commit';
      case 'editor_in_chief':
        return 'approve';
      default:
        return 'view';
    }
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
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-64"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
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
                <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <svg className="mx-auto mb-2 h-8 w-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-xs text-white/50">No submissions in this column</p>
                </div>
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
                          className="text-[var(--accent)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(submission, 'primary');
                          }}
                          disabled={isProcessing === submission.id}
                        >
                          {isProcessing === submission.id ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Processing...
                            </>
                          ) : (
                            getActionLabel(userRole, submission)
                          )}
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
