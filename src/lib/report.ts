// Shared report model: imported by API routes, the AI-worker contract and the React UI.
// Keep this file free of Node/DOM imports so it runs on both sides.

/** Single source of truth for workflow state. Archiving is the separate `isArchived` flag. */
export type ReportStatus = 'QUEUED' | 'PROCESSING' | 'DRAFT' | 'BLOCKED' | 'FAILED' | 'FINALIZED';

/** PENDING (awaiting AI) · PASS (AI audit passed) · BLOCKED (AI needs clarification) · LEGACY (pre-2026-10 rows, never audited in-app) */
export type AuditStatus = 'PENDING' | 'PASS' | 'BLOCKED' | 'LEGACY';

export interface FindingItem {
  structure: string;
  content: string;
  isAbnormal?: boolean;
}

export interface FindingSection {
  title: string;
  items: FindingItem[];
}

export interface ReportItem {
  id: string;
  tokenNumber: string;
  patientName: string;
  age: string;
  gender: string;
  mrNumber: string | null;
  modality: string;
  studyDate: string;
  reportingDate: string;
  referringClinician: string | null;
  clinicalHistory: string | null;
  comparison: string | null;
  technique: string;
  findingsJson: string;
  findingsMarkdown: string;
  impressionMarkdown: string;
  recommendationsMarkdown: string;
  isUrgent: boolean | null;
  urgentFindings: string | null;
  urgentCallLog: string | null;
  imagePath: string;
  verbatimTranscription: string | null;
  verificationSheetMarkdown: string | null;
  auditStatus: AuditStatus | string | null;
  status: ReportStatus;
  isArchived: boolean | null;
  lastError: string | null;
  ownerNotes: string | null;
  /** ISO strings once JSON-serialised by the API. */
  createdAt: string;
  updatedAt: string;
}

/** The only fields POST /api/reports accepts. Status, archive and audit fields move through explicit actions. */
export const EDITABLE_FIELDS = [
  'tokenNumber',
  'patientName',
  'age',
  'gender',
  'mrNumber',
  'modality',
  'studyDate',
  'referringClinician',
  'clinicalHistory',
  'comparison',
  'technique',
  'findingsJson',
  'impressionMarkdown',
  'recommendationsMarkdown',
  'isUrgent',
  'urgentFindings',
  'urgentCallLog',
  'ownerNotes',
  'imagePath',
] as const satisfies readonly (keyof ReportItem)[];

export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type ReportPatch = Partial<Pick<ReportItem, EditableField>>;

/** Report body is read-only in these states (server answers 409 to edits). */
export const LOCKED_STATUSES: readonly ReportStatus[] = ['QUEUED', 'PROCESSING', 'FINALIZED'];

/** States from which a case may be (re)sent to the AI worker. */
export const QUEUEABLE_STATUSES: readonly ReportStatus[] = ['DRAFT', 'BLOCKED', 'FAILED'];

export const isLocked = (status: ReportStatus) => LOCKED_STATUSES.includes(status);

export function pickEditable(input: Record<string, unknown>): ReportPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in input) patch[key] = input[key];
  }
  return patch as ReportPatch;
}

export function parseFindings(json: string | null | undefined): FindingSection[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(isFindingSection) : [];
  } catch {
    return [];
  }
}

function isFindingSection(value: unknown): value is FindingSection {
  const s = value as FindingSection;
  return !!s && typeof s.title === 'string' && Array.isArray(s.items) && s.items.every(isFindingItem);
}

function isFindingItem(value: unknown): value is FindingItem {
  const i = value as FindingItem;
  return !!i && typeof i.structure === 'string' && typeof i.content === 'string';
}

export function findingsToMarkdown(sections: FindingSection[]): string {
  return sections
    .map((s) => `### ${s.title}\n` + s.items.map((i) => `- **${i.structure}:** ${i.content}`).join('\n'))
    .join('\n\n');
}

/** A body exists once findings and an impression are present — the minimum for issuing a PDF. */
export function hasReportBody(r: Pick<ReportItem, 'findingsJson' | 'impressionMarkdown'>): boolean {
  return parseFindings(r.findingsJson).some((s) => s.items.length > 0) && r.impressionMarkdown.trim().length > 0;
}

/** True when the case still has no clinical content (blank ingest draft). */
export function isBlankDraft(r: Pick<ReportItem, 'findingsJson' | 'impressionMarkdown' | 'technique'>): boolean {
  return !hasReportBody(r) && !r.technique.trim();
}

/** What the AI worker must return; validated by `validateWorkerResult` before anything is written. */
export interface WorkerResult {
  status: 'READY' | 'BLOCKED';
  patientName: string;
  age: string;
  gender: string;
  tokenNumber: string;
  mrNumber: string;
  modality: string;
  studyDate: string;
  referringClinician: string;
  clinicalHistory: string;
  comparison: string;
  technique: string;
  findings: FindingSection[];
  impression: string[];
  recommendations: string[];
  isUrgent: boolean;
  urgentFindings: string;
  verbatimTranscription: string;
  verificationSheet: string;
}

const WORKER_STRING_FIELDS = [
  'patientName',
  'age',
  'gender',
  'tokenNumber',
  'mrNumber',
  'modality',
  'studyDate',
  'referringClinician',
  'clinicalHistory',
  'comparison',
  'technique',
  'urgentFindings',
  'verbatimTranscription',
  'verificationSheet',
] as const;

/** Returns a list of problems; empty means the result is safe to store and print. */
export function validateWorkerResult(value: unknown): string[] {
  const r = value as Record<string, unknown>;
  if (!r || typeof r !== 'object') return ['result is not an object'];
  const errors: string[] = [];
  if (r.status !== 'READY' && r.status !== 'BLOCKED') errors.push('status must be READY or BLOCKED');
  for (const key of WORKER_STRING_FIELDS) {
    if (typeof r[key] !== 'string') errors.push(`${key} must be a string`);
  }
  if (typeof r.isUrgent !== 'boolean') errors.push('isUrgent must be a boolean');
  if (!Array.isArray(r.findings) || !r.findings.every(isFindingSection)) errors.push('findings must be [{title, items:[{structure, content}]}]');
  for (const key of ['impression', 'recommendations'] as const) {
    if (!Array.isArray(r[key]) || !(r[key] as unknown[]).every((s) => typeof s === 'string')) errors.push(`${key} must be string[]`);
  }
  if (r.status === 'READY' && errors.length === 0) {
    const res = r as unknown as WorkerResult;
    if (!res.findings.some((s) => s.items.length > 0)) errors.push('READY result has no findings');
    if (res.impression.length === 0) errors.push('READY result has no impression');
    if (!res.verificationSheet.trim()) errors.push('READY result has no verification sheet');
  }
  return errors;
}

/** Maps a validated worker result onto report columns. Never touches urgentCallLog: only a human logs calls. */
export function workerResultToColumns(r: WorkerResult) {
  return {
    patientName: r.patientName,
    age: r.age,
    gender: r.gender,
    tokenNumber: r.tokenNumber,
    mrNumber: r.mrNumber,
    modality: r.modality,
    studyDate: r.studyDate,
    referringClinician: r.referringClinician,
    clinicalHistory: r.clinicalHistory,
    comparison: r.comparison,
    technique: r.technique,
    findingsJson: JSON.stringify(r.findings),
    findingsMarkdown: findingsToMarkdown(r.findings),
    impressionMarkdown: r.impression.map((line, i) => `${i + 1}. ${line}`).join('\n'),
    recommendationsMarkdown: r.recommendations.join('\n'),
    isUrgent: r.isUrgent,
    urgentFindings: r.urgentFindings || null,
    verbatimTranscription: r.verbatimTranscription,
    verificationSheetMarkdown: r.verificationSheet,
    auditStatus: (r.status === 'READY' ? 'PASS' : 'BLOCKED') as AuditStatus,
    status: (r.status === 'READY' ? 'DRAFT' : 'BLOCKED') as ReportStatus,
    lastError: null,
  };
}
