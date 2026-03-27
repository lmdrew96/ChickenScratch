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
  notificationFailures,
  exhibitionSubmissions,
  exhibitionConfig,
  zineIssues,
} from '@/lib/db/schema';
import type { ImageTransform } from '@/types/image-transform';

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

// --- Notification Failures ---
export type NotificationFailure = InferSelectModel<typeof notificationFailures>;
export type NewNotificationFailure = InferInsertModel<typeof notificationFailures>;

// --- Exhibition Submissions ---
export type ExhibitionSubmission = InferSelectModel<typeof exhibitionSubmissions>;
export type NewExhibitionSubmission = InferInsertModel<typeof exhibitionSubmissions>;

// --- Exhibition Config ---
export type ExhibitionConfig = InferSelectModel<typeof exhibitionConfig>;
export type NewExhibitionConfig = InferInsertModel<typeof exhibitionConfig>;

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
  | 'volume'
  | 'issue_number'
  | 'publish_date'
  | 'art_files'
  | 'image_transform'
  | 'updated_at'
  | 'created_at'
>;

export type PublishedSubmission = Omit<PublishedSubmissionRow, 'art_files' | 'image_transform'> & {
  art_files: string[];
  coverSignedUrl: string | null;
  imageTransform: ImageTransform | null;
  processedSignedUrl: string | null;
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
  | 'volume'
  | 'issue_number'
  | 'publish_date'
  | 'published_html'
  | 'updated_at'
>;

// --- Zine Issues ---
export type ZineIssue = InferSelectModel<typeof zineIssues>;
export type NewZineIssue = InferInsertModel<typeof zineIssues>;
