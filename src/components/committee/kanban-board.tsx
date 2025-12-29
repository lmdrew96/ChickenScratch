'use client';

import { useState, useEffect } from 'react';
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
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(null);

  // Define columns based on user role
  const getColumns = (): KanbanColumn[] => {
    // Editor-in-Chief sees ALL columns from all positions
    if (userRole === 'editor_in_chief') {
      const columns = [
        // Submissions Coordinator columns
        {
          id: 'new',
          title: 'New Submissions',
          submissions: submissions.filter(s => !s.committee_status || s.committee_status === 'pending_coordinator'),
          canInteract: true
        },
        {
          id: 'coordinator_reviewing', 
          title: 'Coordinator Review',
          submissions: submissions.filter(s => s.committee_status === 'with_coordinator'),
          canInteract: true
        },
        {
          id: 'coordinator_approved',
          title: 'Coordinator Approved',
          submissions: submissions.filter(s => s.committee_status === 'coordinator_approved'),
          canInteract: true
        },
        // Proofreader columns (writing only)
        {
          id: 'proofreader_assigned',
          title: 'Proofreader Assigned',
          submissions: submissions.filter(s => 
            s.committee_status === 'coordinator_approved' && s.type === 'writing'
          ),
          canInteract: true
        },
        {
          id: 'proofreader_in_progress',
          title: 'Proofreading', 
          submissions: submissions.filter(s => 
            s.google_docs_link && !s.proofreader_committed_at && s.type === 'writing'
          ),
          canInteract: true
        },
        {
          id: 'proofreader_committed',
          title: 'Proofread Complete',
          submissions: submissions.filter(s => s.committee_status === 'proofreader_committed'),
          canInteract: true
        },
        // Lead Design columns
        {
          id: 'design_visual_assigned',
          title: 'Design: Visual Art',
          submissions: submissions.filter(s => 
            s.committee_status === 'coordinator_approved' && s.type === 'visual'
          ),
          canInteract: true
        },
        {
          id: 'design_from_proofread',
          title: 'Design: From Proofread',
          submissions: submissions.filter(s => s.committee_status === 'proofreader_committed'),
          canInteract: true
        },
        {
          id: 'design_in_canva',
          title: 'In Canva',
          submissions: submissions.filter(s => 
            s.lead_design_commit_link && !s.lead_design_committed_at
          ),
          canInteract: true
        },
        {
          id: 'design_committed',
          title: 'Design Complete',
          submissions: submissions.filter(s => s.committee_status === 'lead_design_committed'),
          canInteract: true
        },
        // Editor-in-Chief final review columns
        {
          id: 'eic_ready_for_review',
          title: 'EIC: Final Review',
          submissions: submissions.filter(s => 
            s.committee_status === 'with_editor_in_chief' || 
            s.committee_status === 'lead_design_committed' ||
            s.committee_status === 'proofreader_committed'
          ),
          canInteract: true
        },
        {
          id: 'eic_approved',
          title: 'EIC: Approved',
          submissions: submissions.filter(s => s.committee_status === 'editor_approved'),
          canInteract: true
        },
        {
          id: 'eic_declined',
          title: 'EIC: Declined',
          submissions: submissions.filter(s => s.committee_status === 'editor_declined' || s.committee_status === 'coordinator_declined'),
          canInteract: true
        }
      ];
      console.log('[KanbanBoard] EIC columns:', columns.length, 'columns generated');
      return columns;
    }
    
    console.log('[KanbanBoard] Checking switch statement for role:', userRole);
    switch (userRole) {
      case 'submissions_coordinator':
        console.log('[KanbanBoard] Matched submissions_coordinator');
        const coordColumns = [
          {
            id: 'new',
            title: 'New Submissions',
            submissions: submissions.filter(s => !s.committee_status || s.committee_status === 'pending_coordinator'),
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
        console.log('[KanbanBoard] Coordinator columns:', coordColumns.length);
        return coordColumns;

      case 'proofreader':
        console.log('[KanbanBoard] Matched proofreader');
        const proofColumns = [
          {
            id: 'assigned',
            title: 'Assigned to Me',
            submissions: submissions.filter(s => 
              s.committee_status === 'coordinator_approved' && s.type === 'writing'
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
        console.log('[KanbanBoard] Proofreader columns:', proofColumns.length);
        return proofColumns;

      case 'lead_design':
        console.log('[KanbanBoard] Matched lead_design');
        const designColumns = [
          {
            id: 'visual_assigned',
            title: 'Visual Art Assigned',
            submissions: submissions.filter(s => 
              s.committee_status === 'coordinator_approved' && s.type === 'visual'
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
        console.log('[KanbanBoard] Lead Design columns:', designColumns.length);
        return designColumns;

      default:
        console.log('[KanbanBoard] No role match, using default');
        return [
          {
            id: 'all',
            title: 'All Submissions',
            submissions: submissions,
            canInteract: false
          }
        ];
    }
  };

  const columns = getColumns();
  
  // Log column details after generation
  useEffect(() => {
    console.log('[KanbanBoard] Columns generated:', columns.length);
    columns.forEach((col, idx) => {
      console.log(`[KanbanBoard] Column ${idx + 1}: "${col.title}" - ${col.submissions.length} submissions`);
      if (col.submissions.length > 0) {
        console.log(`  Sample submission statuses:`, col.submissions.slice(0, 3).map(s => ({
          title: s.title,
          status: s.committee_status,
          type: s.type
        })));
      }
    });
  }, [columns]);

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const handleAction = async (submission: Submission, action: string) => {
    try {
      setIsProcessing(submission.id);
      
      const payload: {
        submissionId: string;
        action: string;
        linkUrl?: string;
        comment?: string;
      } = {
        submissionId: submission.id,
        action,
      };

      // Handle specific actions
      if (action === 'open_docs') {
        // If google_docs_link exists, open it directly in edit mode
        if (submission.google_docs_link) {
          setGoogleDocUrl(submission.google_docs_link);
          setIsProcessing(null);
          return;
        }
        // Otherwise, prompt for URL (fallback for manual entry)
        const url = prompt('Enter Google Docs link:');
        if (!url) {
          setIsProcessing(null);
          return;
        }
        payload.action = 'commit';
        payload.linkUrl = url;
      } else if (action === 'canva_link') {
        const url = prompt('Enter Canva share link:');
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

      const result = await response.json();

      // If response contains google_doc_url, show it in modal (keep in edit mode)
      if (result.google_doc_url) {
        setGoogleDocUrl(result.google_doc_url);
        setIsProcessing(null);
        return;
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Action failed:', error);
      alert(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(null);
    }
  };

  // Get context-aware button configuration for a submission
  const getSubmissionButtons = (submission: Submission, columnId: string) => {
    if (userRole === 'submissions_coordinator') {
      // New Submissions column - only show Review button
      if (columnId === 'new') {
        return [
          { label: 'Review', action: 'review', variant: 'primary' as const }
        ];
      }
      // Under Review column - show Review (webhook) and Approve/Decline buttons
      if (columnId === 'reviewing') {
        return [
          { label: 'Review', action: 'review', variant: 'primary' as const },
          { label: 'Approve', action: 'approve', variant: 'success' as const },
          { label: 'Decline', action: 'decline', variant: 'danger' as const }
        ];
      }
    }
    
    // Default single button for other roles
    if (userRole === 'proofreader') {
      return [{ label: 'Edit Docs', action: 'open_docs', variant: 'primary' as const }];
    }
    if (userRole === 'lead_design') {
      return [{ label: 'Add to Canva', action: 'canva_link', variant: 'primary' as const }];
    }
    if (userRole === 'editor_in_chief') {
      return [{ label: 'Final Review', action: 'approve', variant: 'primary' as const }];
    }
    
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">
            {userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Workflow
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

      <div className={`grid gap-6 ${userRole === 'editor_in_chief' ? 'lg:grid-cols-4 xl:grid-cols-5' : 'lg:grid-cols-3'}`}>
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
                        <div className="flex items-center gap-2">
                          {getSubmissionButtons(submission, column.id).map((button) => (
                            <button
                              key={button.action}
                              className={`
                                text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1
                                ${button.variant === 'primary' ? 'text-[var(--accent)] hover:underline' : ''}
                                ${button.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                ${button.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(submission, button.action);
                              }}
                              disabled={isProcessing === submission.id}
                            >
                              {isProcessing === submission.id ? (
                                <>
                                  <LoadingSpinner size="sm" />
                                  Processing...
                                </>
                              ) : (
                                button.label
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Google Doc Modal */}
      {googleDocUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg)] border border-white/10 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Google Doc Editor
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    window.open(googleDocUrl, '_blank');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </button>
                <button
                  onClick={() => {
                    setGoogleDocUrl(null);
                    window.location.reload();
                  }}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Modal Body - Iframe */}
            <div className="flex-1 p-4 overflow-hidden">
              <iframe
                src={googleDocUrl}
                className="w-full h-full rounded-lg border border-white/10"
                title="Google Doc Editor"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}

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
                {/* Show "Open Google Doc" button if google_docs_link exists */}
                {selectedSubmission.google_docs_link && (
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
                    onClick={() => {
                      setGoogleDocUrl(selectedSubmission.google_docs_link!);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Open Google Doc
                  </button>
                )}
                
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
                    {selectedSubmission.google_docs_link ? 'Edit Docs' : 'Add Google Docs Link'}
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
