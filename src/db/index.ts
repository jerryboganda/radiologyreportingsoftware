import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'node:path';
import fs from 'node:fs';

/** Holds radiology.db and pdfs/. DATA_DIR overrides it (isolated test servers). */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlitePath = path.join(DATA_DIR, 'radiology.db').replace(/\\/g, '/');
export const client = createClient({
  url: `file:${sqlitePath}`
});

// Initialize table schema if not already present
await client.execute(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    token_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    age TEXT NOT NULL,
    gender TEXT NOT NULL,
    mr_number TEXT,
    modality TEXT NOT NULL,
    study_date TEXT NOT NULL,
    reporting_date TEXT NOT NULL,
    referring_clinician TEXT,
    clinical_history TEXT,
    comparison TEXT,
    technique TEXT NOT NULL,
    findings_json TEXT NOT NULL,
    findings_markdown TEXT NOT NULL,
    impression_markdown TEXT NOT NULL,
    recommendations_markdown TEXT NOT NULL,
    is_urgent INTEGER DEFAULT 0,
    urgent_findings TEXT,
    urgent_call_log TEXT,
    image_path TEXT NOT NULL,
    verbatim_transcription TEXT,
    verification_sheet_markdown TEXT,
    audit_status TEXT DEFAULT 'PENDING',
    status TEXT DEFAULT 'DRAFT',
    is_archived INTEGER DEFAULT 0,
    last_error TEXT,
    owner_notes TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );
`);

try {
  await client.execute(`ALTER TABLE reports ADD COLUMN is_archived INTEGER DEFAULT 0;`);
} catch (e) {
  // column already exists
}

// One-time upgrade of pre-2026-10 databases (recognised by the missing owner_notes column).
const columns = new Set((await client.execute('PRAGMA table_info(reports)')).rows.map((c) => String(c.name)));
if (!columns.has('owner_notes')) {
  await client.batch([
    ...['urgent_findings', 'last_error', 'owner_notes']
      .filter((c) => !columns.has(c))
      .map((c) => `ALTER TABLE reports ADD COLUMN ${c} TEXT`),
    // Old scripts wrote some rows in milliseconds into these seconds columns.
    'UPDATE reports SET created_at = created_at / 1000 WHERE created_at > 100000000000',
    'UPDATE reports SET updated_at = updated_at / 1000 WHERE updated_at > 100000000000',
    // Archive is now only the is_archived flag; in-flight and retired statuses fall back to DRAFT.
    "UPDATE reports SET status = 'DRAFT', is_archived = 1 WHERE status = 'ARCHIVED'",
    "UPDATE reports SET status = 'DRAFT' WHERE status IN ('QUEUED', 'PROCESSING', 'REVIEWED')",
    // Their verification sheets were never audited in-app.
    "UPDATE reports SET audit_status = 'LEGACY'",
  ], 'write');
}

export const db = drizzle(client, { schema });
