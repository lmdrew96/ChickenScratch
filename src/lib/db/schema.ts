import { pgTable, uuid, text, boolean, integer, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  clerk_id: text('clerk_id'),
  email: text('email'),
  name: text('name'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  pronouns: text('pronouns'),
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
  preferred_name: text('preferred_name'),
  content_warnings: text('content_warnings'),
  word_count: integer('word_count'),
  text_body: text('text_body'),
  file_url: text('file_url'),
  file_name: text('file_name'),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  art_files: jsonb('art_files').default([]),
  art_file_statuses: jsonb('art_file_statuses').default({}),
  cover_image: text('cover_image'),
  status: text('status').default('submitted'),
  assigned_editor: uuid('assigned_editor').references(() => profiles.id),
  editor_notes: text('editor_notes'),
  decision_date: timestamp('decision_date', { withTimezone: true }),
  published: boolean('published'),
  published_url: text('published_url'),
  issue: text('issue'),
  volume: integer('volume'),
  issue_number: integer('issue_number'),
  publish_date: timestamp('publish_date', { withTimezone: true }),
  published_html: text('published_html'),
  proofread_html: text('proofread_html'),
  image_transform: jsonb('image_transform'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Committee workflow fields
  committee_status: text('committee_status'),
  google_docs_link: text('google_docs_link'),
  committee_comments: jsonb('committee_comments').default([]),
  decline_reason: text('decline_reason'),
  coordinator_reviewed_at: timestamp('coordinator_reviewed_at', { withTimezone: true }),
  proofreader_committed_at: timestamp('proofreader_committed_at', { withTimezone: true }),
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
  is_alumni: boolean('is_alumni').default(false).notNull(),
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
  finalized_date: timestamp('finalized_date', { withTimezone: true }), // The agreed meeting time
  finalized_at: timestamp('finalized_at', { withTimezone: true }), // When the finalized button was pressed
  archived_at: timestamp('archived_at', { withTimezone: true }),
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

export const reminderLog = pgTable('reminder_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity_type: text('entity_type').notNull(),
  entity_id: uuid('entity_id').notNull(),
  reminder_type: text('reminder_type').notNull(),
  sent_to: text('sent_to').notNull(),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('reminder_log_entity_idx').on(table.entity_type, table.entity_id),
]);

export const webhookEvents = pgTable('webhook_events', {
  svix_id: text('svix_id').primaryKey(),
  processed_at: timestamp('processed_at', { withTimezone: true }).defaultNow(),
});

export const exhibitionSubmissions = pgTable('exhibition_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner_id: uuid('owner_id').notNull().references(() => profiles.id),

  // Submitter info
  preferred_name: text('preferred_name'),

  // Piece info
  title: text('title').notNull(),
  type: text('type').notNull(), // 'writing' or 'visual'
  medium: text('medium').notNull(),
  description: text('description'),
  artist_statement: text('artist_statement'),
  content_warnings: text('content_warnings'),

  // Writing-specific
  text_body: text('text_body'),
  word_count: integer('word_count'),

  // Visual art-specific
  file_url: text('file_url'),
  file_name: text('file_name'),
  file_type: text('file_type'),
  file_size: integer('file_size'),

  // Physical display needs
  display_format: text('display_format'),
  display_notes: text('display_notes'),

  // Review
  status: text('status').default('submitted'), // submitted, approved, declined
  reviewer_id: uuid('reviewer_id').references(() => profiles.id),
  reviewer_notes: text('reviewer_notes'),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),

  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('exhibition_submissions_owner_id_idx').on(table.owner_id),
  index('exhibition_submissions_status_idx').on(table.status),
]);

export const exhibitionConfig = pgTable('exhibition_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const siteConfig = pgTable('site_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const notificationFailures = pgTable('notification_failures', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'committee' | 'author_status' | 'officer' | 'reminder' | 'contact'
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  error_message: text('error_message').notNull(),
  context: jsonb('context'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const zineIssues = pgTable('zine_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  volume: integer('volume'),
  issue_number: integer('issue_number'),
  publish_date: timestamp('publish_date', { withTimezone: true }),
  pdf_url: text('pdf_url'),
  is_published: boolean('is_published').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('zine_issues_is_published_idx').on(table.is_published),
]);

export type NotificationType =
  | 'status_changed'
  | 'assignment'
  | 'comment'
  | 'announcement'
  | 'task_assigned'
  | 'committee_action';

export const notifications = pgTable('notifications', {
  id:           uuid('id').primaryKey().defaultRandom(),
  recipient_id: uuid('recipient_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type:         text('type').notNull(),
  title:        text('title').notNull(),
  body:         text('body'),
  link:         text('link'),
  read_at:      timestamp('read_at', { withTimezone: true }),
  created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_recipient_id_idx').on(table.recipient_id),
]);

export const reimbursements = pgTable('reimbursements', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  receipt_date: timestamp('receipt_date', { withTimezone: true }),
  submitted_at: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  check_received_at: timestamp('check_received_at', { withTimezone: true }),
  check_number: text('check_number'),
  ledgered_at: timestamp('ledgered_at', { withTimezone: true }),
  ledger_entry_id: uuid('ledger_entry_id'),
  notes: text('notes'),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const meetingAttendance = pgTable('meeting_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  meeting_id: uuid('meeting_id').notNull().references(() => meetingProposals.id, { onDelete: 'cascade' }),
  member_id: uuid('member_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  recorded_at: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  recorded_by: uuid('recorded_by').references(() => profiles.id),
}, (table) => [
  index('meeting_attendance_meeting_id_idx').on(table.meeting_id),
  index('meeting_attendance_member_id_idx').on(table.member_id),
]);

export const sopArticles = pgTable('sop_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  role_slug: text('role_slug').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  body_md: text('body_md').default('').notNull(),
  tags: text('tags').array().default([]),
  is_draft: boolean('is_draft').default(false).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sop_articles_role_slug_idx').on(table.role_slug),
]);

export const upcomingExpenses = pgTable('upcoming_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  expected_date: timestamp('expected_date', { withTimezone: true }),
  counts_toward_gob: boolean('counts_toward_gob').default(true).notNull(),
  notes: text('notes'),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  entry_type: text('entry_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  category: text('category'),
  description: text('description'),
  entry_date: timestamp('entry_date', { withTimezone: true }).defaultNow().notNull(),
  payment_method: text('payment_method'),
  purpose_code: text('purpose_code'),
  is_out_of_pocket: boolean('is_out_of_pocket').default(false).notNull(),
  counts_toward_gob: boolean('counts_toward_gob').default(true).notNull(),
  deposited_at: timestamp('deposited_at', { withTimezone: true }),
  reimbursement_id: uuid('reimbursement_id').references(() => reimbursements.id, { onDelete: 'set null' }),
  notes: text('notes'),
  created_by: uuid('created_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ledger_entries_entry_date_idx').on(table.entry_date),
  index('ledger_entries_type_idx').on(table.entry_type),
]);

export const recurringTaskCompletions = pgTable('recurring_task_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  task_id: text('task_id').notNull(),
  cycle_key: text('cycle_key').notNull(),
  completed_at: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('recurring_task_completions_user_cycle_idx').on(table.user_id, table.cycle_key),
]);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  author_id: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  target_type: text('target_type').notNull(), // 'submission' | 'issue'
  target_id: text('target_id').notNull(),     // uuid of the submission or zine issue
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('comments_target_idx').on(table.target_type, table.target_id),
  index('comments_author_id_idx').on(table.author_id),
]);
