import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  clerk_id: text('clerk_id'),
  email: text('email'),
  name: text('name'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  pronouns: text('pronouns'),
  role: text('role'),
  updated_at: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
  index('profiles_clerk_id_idx').on(table.clerk_id),
  index('profiles_email_idx').on(table.email),
]);

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner_id: uuid('owner_id').notNull().references(() => profiles.id),
  title: text('title').notNull(),
  type: text('type').notNull(),
  genre: text('genre'),
  summary: text('summary'),
  content_warnings: text('content_warnings'),
  word_count: integer('word_count'),
  text_body: text('text_body'),
  file_url: text('file_url'),
  file_name: text('file_name'),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  art_files: jsonb('art_files').default([]),
  cover_image: text('cover_image'),
  status: text('status').default('submitted'),
  assigned_editor: uuid('assigned_editor').references(() => profiles.id),
  editor_notes: text('editor_notes'),
  decision_date: timestamp('decision_date', { withTimezone: true }),
  published: boolean('published'),
  published_url: text('published_url'),
  issue: text('issue'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Committee workflow fields
  committee_status: text('committee_status'),
  google_docs_link: text('google_docs_link'),
  lead_design_commit_link: text('lead_design_commit_link'),
  committee_comments: jsonb('committee_comments').default([]),
  workflow_step: text('workflow_step'),
  decline_reason: text('decline_reason'),
  original_files: jsonb('original_files').default([]),
  current_version: integer('current_version'),
  version_history: jsonb('version_history').default([]),
  assigned_coordinator: uuid('assigned_coordinator').references(() => profiles.id),
  assigned_proofreader: uuid('assigned_proofreader').references(() => profiles.id),
  assigned_lead_design: uuid('assigned_lead_design').references(() => profiles.id),
  assigned_editor_in_chief: uuid('assigned_editor_in_chief').references(() => profiles.id),
  coordinator_reviewed_at: timestamp('coordinator_reviewed_at', { withTimezone: true }),
  proofreader_committed_at: timestamp('proofreader_committed_at', { withTimezone: true }),
  lead_design_committed_at: timestamp('lead_design_committed_at', { withTimezone: true }),
  editor_reviewed_at: timestamp('editor_reviewed_at', { withTimezone: true }),
}, (table) => [
  index('submissions_owner_id_idx').on(table.owner_id),
  index('submissions_status_idx').on(table.status),
  index('submissions_published_idx').on(table.published),
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actor_id: uuid('actor_id').references(() => profiles.id),
  submission_id: uuid('submission_id').notNull(), // No FK — audit logs must persist after submission deletion
  action: text('action').notNull(),
  details: jsonb('details'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('audit_log_submission_id_idx').on(table.submission_id),
]);

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => profiles.id),
  is_member: boolean('is_member').default(false).notNull(),
  roles: text('roles').array().default([]),
  positions: text('positions').array().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('user_roles_user_id_idx').on(table.user_id),
]);

export const meetingProposals = pgTable('meeting_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  proposed_dates: jsonb('proposed_dates').default([]),
  finalized_date: timestamp('finalized_date', { withTimezone: true }),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const officerAvailability = pgTable('officer_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => profiles.id),
  meeting_proposal_id: uuid('meeting_proposal_id').notNull().references(() => meetingProposals.id),
  available_slots: jsonb('available_slots').default([]),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('officer_availability_meeting_id_idx').on(table.meeting_proposal_id),
]);

export const officerTasks = pgTable('officer_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  assigned_to: uuid('assigned_to').references(() => profiles.id),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  status: text('status').default('todo'),
  priority: text('priority').default('medium'),
  due_date: timestamp('due_date', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const officerAnnouncements = pgTable('officer_announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  message: text('message').notNull(),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
