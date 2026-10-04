// Server-only case storage helpers for the API routes: note uploads, blank-draft ingest, guarded updates.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { reports, type NewReport } from '../db/schema';
import { readInstitution } from './institutionStore';

export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
export const INPUT_DIR = path.resolve(process.env.INPUT_DIR || path.join(process.cwd(), 'input'));

/** Note photos accepted from uploads and input/: extension → MIME type. */
export const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Local calendar date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Stores a note photo under a sanitised, timestamped name. Throws an Error with `status: 415` for other types. */
export async function saveUpload(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_TYPES[ext] || !Object.values(IMAGE_TYPES).includes(file.type)) {
    throw Object.assign(new Error('Only JPG, PNG or WebP images are accepted'), { status: 415 });
  }
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const filename = `${base}_${Date.now()}${ext}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return { filename, url: `/uploads/${filename}` };
}

/** Inserts the blank, auto-queued case for a new note photo. Nothing is guessed: unknown fields stay empty. */
export async function createPendingDraft(imagePath: string) {
  const now = new Date();
  // The letterhead / sign-off profile is copied onto the case now, so editing the profile later
  // never rewrites a report that was created (or issued) with the old one.
  const institution = await readInstitution();
  const [row] = await db
    .insert(reports)
    .values({
      id: crypto.randomUUID(),
      tokenNumber: '',
      patientName: '',
      age: '',
      gender: '',
      modality: '',
      studyDate: '',
      reportingDate: today(now),
      technique: '',
      findingsJson: '[]',
      findingsMarkdown: '',
      impressionMarkdown: '',
      recommendationsMarkdown: '',
      isUrgent: false,
      imagePath,
      auditStatus: 'PENDING',
      status: 'QUEUED',
      isArchived: false,
      institutionJson: JSON.stringify(institution),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

/**
 * Applies `set` (plus updatedAt) to one report in a single statement, only while `guard` holds.
 * Responds with the updated row, 404 for an unknown id, or 409 when the case's state rules the change out.
 */
export async function guardedUpdate(id: string, set: Partial<NewReport>, guard?: SQL) {
  const [row] = await db
    .update(reports)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(reports.id, id), guard))
    .returning();
  if (row) return Response.json(row);
  const [current] = await db.select({ status: reports.status }).from(reports).where(eq(reports.id, id));
  return current
    ? Response.json({ error: `Not allowed while the case is ${current.status}` }, { status: 409 })
    : Response.json({ error: 'Report not found' }, { status: 404 });
}
