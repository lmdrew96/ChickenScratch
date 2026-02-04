import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  profiles,
  submissions,
  auditLog,
  userRoles,
  meetingProposals,
  officerAvailability,
  officerTasks,
  officerAnnouncements,
} from '@/lib/db/schema';

// Generic JSON type (matches jsonb columns)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Profiles ---
export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

// --- Submissions ---
export type Submission = InferSelectModel<typeof submissions>;
export type NewSubmission = InferInsertModel<typeof submissions>;

// --- Audit Log ---
export type AuditLog = InferSelectModel<typeof auditLog>;
export type NewAuditLog = InferInsertModel<typeof auditLog>;

// --- User Roles ---
export type UserRole = InferSelectModel<typeof userRoles>;
export type NewUserRole = InferInsertModel<typeof userRoles>;

// --- Meeting Proposals ---
export type MeetingProposal = InferSelectModel<typeof meetingProposals>;
export type NewMeetingProposal = InferInsertModel<typeof meetingProposals>;

// --- Officer Availability ---
export type OfficerAvailability = InferSelectModel<typeof officerAvailability>;
export type NewOfficerAvailability = InferInsertModel<typeof officerAvailability>;

// --- Officer Tasks ---
export type OfficerTask = InferSelectModel<typeof officerTasks>;
export type NewOfficerTask = InferInsertModel<typeof officerTasks>;

// --- Officer Announcements ---
export type OfficerAnnouncement = InferSelectModel<typeof officerAnnouncements>;
export type NewOfficerAnnouncement = InferInsertModel<typeof officerAnnouncements>;

// Published submission types for the public gallery
export type PublishedSubmissionRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'published_url'
  | 'issue'
  | 'art_files'
  | 'updated_at'
  | 'created_at'
>;

export type PublishedSubmission = Omit<PublishedSubmissionRow, 'art_files'> & {
  art_files: string[];
  coverSignedUrl: string | null;
};

export type PublishedDetailRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'content_warnings'
  | 'art_files'
  | 'text_body'
  | 'published_url'
  | 'issue'
  | 'updated_at'
>;
