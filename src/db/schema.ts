import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  tokenNumber: text('token_number').notNull(),
  patientName: text('patient_name').notNull(),
  age: text('age').notNull(),
  gender: text('gender').notNull(),
  mrNumber: text('mr_number'),
  modality: text('modality').notNull(),
  studyDate: text('study_date').notNull(),
  reportingDate: text('reporting_date').notNull(),
  referringClinician: text('referring_clinician'),
  clinicalHistory: text('clinical_history'),
  comparison: text('comparison'),
  technique: text('technique').notNull(),
  findingsJson: text('findings_json').notNull(),
  findingsMarkdown: text('findings_markdown').notNull(),
  impressionMarkdown: text('impression_markdown').notNull(),
  recommendationsMarkdown: text('recommendations_markdown').notNull(),
  isUrgent: integer('is_urgent', { mode: 'boolean' }).default(false),
  urgentFindings: text('urgent_findings'),
  urgentCallLog: text('urgent_call_log'),
  imagePath: text('image_path').notNull(),
  verbatimTranscription: text('verbatim_transcription'),
  verificationSheetMarkdown: text('verification_sheet_markdown'),
  auditStatus: text('audit_status').default('PENDING'), // PENDING, PASS, BLOCKED, LEGACY
  status: text('status').default('DRAFT'), // QUEUED, PROCESSING, DRAFT, BLOCKED, FAILED, FINALIZED (archive is the isArchived flag)
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  lastError: text('last_error'),
  ownerNotes: text('owner_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
