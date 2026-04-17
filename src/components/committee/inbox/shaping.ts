import type { Submission } from '@/types/database';

import type { CommitteeRole, InboxAction, InboxItem, InboxSectionId } from './types';

function formatStatusLabel(status: Submission['committee_status']): string {
  if (!status) return 'Pending';
  return String(status).replaceAll('_', ' ');
}

function isDoneForRole(role: CommitteeRole, s: Submission): boolean {
  const cs = s.committee_status;

  switch (role) {
    case 'submissions_coordinator':
      return cs === 'coordinator_approved' || cs === 'coordinator_declined' || cs === 'proofreader_committed' || cs === 'editor_approved' || cs === 'editor_declined';
    case 'proofreader':
      return cs === 'proofreader_committed' || cs === 'editor_approved' || cs === 'editor_declined';
    case 'editor_in_chief':
      return cs === 'editor_approved' || cs === 'editor_declined';
    default:
      return false;
  }
}

function getActionsForRole(role: CommitteeRole, s: Submission): {
  section: InboxSectionId;
  nextActionLabel: string;
  priority: number;
  actions: InboxAction[];
  primaryAction?: InboxAction;
} {
  const cs = s.committee_status;

  const none = {
    section: 'waiting' as const,
    nextActionLabel: 'No action',
    priority: 0,
    actions: [] as InboxAction[],
    primaryAction: undefined,
  };

  if (isDoneForRole(role, s)) {
    return { ...none, section: 'done', nextActionLabel: 'Completed', priority: 0 };
  }

  if (cs === 'changes_requested') {
    return { ...none, section: 'waiting', nextActionLabel: 'Waiting on author', priority: 1 };
  }

  if (role === 'submissions_coordinator') {
    // New submissions: start review
    if (!cs || cs === 'pending_coordinator') {
      const start: InboxAction = { id: 'start_review', label: 'Start review', variant: 'primary', workflowAction: 'review' };
      return {
        section: 'action_required',
        nextActionLabel: 'Start review',
        priority: 100,
        actions: [start],
        primaryAction: start,
      };
    }

    if (cs === 'with_coordinator') {
      const review: InboxAction = { id: 'review', label: s.type === 'visual' ? 'View file' : 'Read submission', variant: 'primary', workflowAction: 'review' };
      const approve: InboxAction = { id: 'approve', label: 'Approve', variant: 'success', workflowAction: 'approve' };
      const requestChanges: InboxAction = { id: 'request_changes', label: 'Request changes', variant: 'warning', workflowAction: 'request_changes', requiresComment: true };
      const decline: InboxAction = { id: 'decline', label: 'Decline', variant: 'danger', workflowAction: 'decline', requiresComment: true };

      return {
        section: 'action_required',
        nextActionLabel: 'Decision needed',
        priority: 90,
        actions: [review, approve, requestChanges, decline],
        primaryAction: review,
      };
    }

    return none;
  }

  if (role === 'proofreader') {
    if (s.type === 'writing' && !s.proofreader_committed_at &&
        (cs === 'coordinator_approved' || cs === 'with_coordinator')) {
      const edit: InboxAction = {
        id: 'open_proofread_editor',
        label: s.proofread_html ? 'Resume editing' : 'Edit in app',
        variant: 'primary',
      };
      const commit: InboxAction = {
        id: 'commit_proofread',
        label: 'Mark committed',
        variant: 'success',
        workflowAction: 'commit',
      };
      const requestChanges: InboxAction = {
        id: 'request_changes',
        label: 'Request changes',
        variant: 'warning',
        workflowAction: 'request_changes',
        requiresComment: true,
      };
      return {
        section: 'action_required',
        nextActionLabel: s.proofread_html ? 'Resume editing' : 'Edit in app',
        priority: cs === 'coordinator_approved' ? 100 : 80,
        actions: [edit, commit, requestChanges],
        primaryAction: edit,
      };
    }

    // Anything else = waiting
    return none;
  }

  if (role === 'editor_in_chief') {
    // EiC can act in any capacity

    // Coordinator stage: new submission
    if (!cs || cs === 'pending_coordinator') {
      const start: InboxAction = { id: 'start_review', label: 'Start review', variant: 'primary', workflowAction: 'review' };
      return { section: 'action_required', nextActionLabel: 'Start review', priority: 100, actions: [start], primaryAction: start };
    }

    // Coordinator stage: under review
    if (cs === 'with_coordinator') {
      const review: InboxAction = { id: 'review', label: s.type === 'visual' ? 'View file' : 'Read submission', variant: 'primary', workflowAction: 'review' };
      const approve: InboxAction = { id: 'approve', label: 'Approve', variant: 'success', workflowAction: 'approve' };
      const requestChanges: InboxAction = { id: 'request_changes', label: 'Request changes', variant: 'warning', workflowAction: 'request_changes', requiresComment: true };
      const decline: InboxAction = { id: 'decline', label: 'Decline', variant: 'danger', workflowAction: 'decline', requiresComment: true };
      return { section: 'action_required', nextActionLabel: 'Decision needed', priority: 90, actions: [review, approve, requestChanges, decline], primaryAction: review };
    }

    // Proofreader stage: writing needs editing
    if (cs === 'coordinator_approved' && s.type === 'writing') {
      const edit: InboxAction = { id: 'open_proofread_editor', label: s.proofread_html ? 'Resume editing' : 'Edit in app', variant: 'primary' };
      const commit: InboxAction = { id: 'commit_proofread', label: 'Mark committed', variant: 'success', workflowAction: 'commit' };
      const requestChanges: InboxAction = { id: 'request_changes', label: 'Request changes', variant: 'warning', workflowAction: 'request_changes', requiresComment: true };
      return { section: 'action_required', nextActionLabel: s.proofread_html ? 'Resume editing' : 'Edit in app', priority: 100, actions: [edit, commit, requestChanges], primaryAction: edit };
    }

    // Final decision stage
    if (cs === 'proofreader_committed' || (cs === 'coordinator_approved' && s.type === 'visual')) {
      const approve: InboxAction = { id: 'final_approve', label: 'Final approve', variant: 'success', workflowAction: 'final_approve' };
      const requestChanges: InboxAction = { id: 'request_changes', label: 'Request changes', variant: 'warning', workflowAction: 'request_changes', requiresComment: true };
      const decline: InboxAction = { id: 'final_decline', label: 'Final decline', variant: 'danger', workflowAction: 'final_decline', requiresComment: true };
      return { section: 'action_required', nextActionLabel: 'Final decision', priority: 100, actions: [approve, requestChanges, decline], primaryAction: approve };
    }

    return none;
  }

  return none;
}

export function shapeInboxItems(submissions: Submission[], role: CommitteeRole): InboxItem[] {
  return submissions
    .map((submission) => {
      const shaped = getActionsForRole(role, submission);
      return {
        submission,
        section: shaped.section,
        nextActionId: shaped.primaryAction?.id ?? (shaped.actions[0]?.id ?? 'none'),
        nextActionLabel: shaped.nextActionLabel,
        priority: shaped.priority,
        actions: shaped.actions,
        primaryAction: shaped.primaryAction,
        statusLabel: formatStatusLabel(submission.committee_status),
      } satisfies InboxItem;
    })
    .sort((a, b) => {
      if (a.section !== b.section) {
        const order: Record<InboxSectionId, number> = {
          action_required: 0,
          waiting: 1,
          done: 2,
          all: 3,
        };
        return order[a.section] - order[b.section];
      }
      if (a.priority !== b.priority) return b.priority - a.priority;
      const aTime = a.submission.created_at ? new Date(a.submission.created_at).getTime() : 0;
      const bTime = b.submission.created_at ? new Date(b.submission.created_at).getTime() : 0;
      return bTime - aTime;
    });
}

