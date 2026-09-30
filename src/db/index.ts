import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'node:path';
import fs from 'node:fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlitePath = path.join(dbDir, 'radiology.db').replace(/\\/g, '/');
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
    urgent_call_log TEXT,
    image_path TEXT NOT NULL,
    verbatim_transcription TEXT,
    verification_sheet_markdown TEXT,
    audit_status TEXT DEFAULT 'PASS',
    status TEXT DEFAULT 'DRAFT',
    created_at INTEGER,
    updated_at INTEGER
  );
`);

export const db = drizzle(client, { schema });
