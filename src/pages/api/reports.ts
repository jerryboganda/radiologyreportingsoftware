import type { APIRoute } from 'astro';
import { db } from '../../db';
import { reports, type NewReport } from '../../db/schema';
import { desc, eq, notInArray } from 'drizzle-orm';
import { LOCKED_STATUSES, findingsToMarkdown, parseFindings, pickEditable } from '../../lib/report';
import { guardedUpdate } from '../../lib/ingest';
import { sanitizeProfile } from '../../lib/institution';
import { checkWording, wordingSignature } from '../../lib/wording';

/** Archive/restore flip only the flag; reopen and dequeue move one specific status back to DRAFT. */
const ACTIONS: Record<string, { set: Partial<NewReport>; from?: string }> = {
  archive: { set: { isArchived: true } },
  restore: { set: { isArchived: false } },
  reopen: { set: { status: 'DRAFT' }, from: 'FINALIZED' },
  dequeue: { set: { status: 'DRAFT' }, from: 'QUEUED' },
};

const NULLABLE_FIELDS = new Set(['mrNumber', 'referringClinician', 'clinicalHistory', 'comparison', 'isUrgent', 'urgentFindings', 'urgentCallLog', 'ownerNotes']);

function isValidValue(key: string, value: unknown) {
  if (value === null) return NULLABLE_FIELDS.has(key);
  if (key === 'isUrgent') return typeof value === 'boolean';
  // The worker resolves this path to a local file, so it may only name a file directly inside uploads/.
  if (key === 'imagePath') return typeof value === 'string' && /^\/uploads\/[^/\\]+$/.test(value);
  return typeof value === 'string';
}

/** The sections, or null unless the JSON is an array whose every section is well formed. */
function strictFindings(json: string) {
  try {
    const parsed = JSON.parse(json);
    const sections = parseFindings(json);
    return Array.isArray(parsed) && sections.length === parsed.length ? sections : null;
  } catch {
    return null;
  }
}

/** JSON.parse that returns undefined instead of throwing; null means it was not an object. */
function safeParse(json: string): unknown {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async () => {
  try {
    // createdAt (not updatedAt) so autosave never reorders the list.
    return Response.json(await db.select().from(reports).orderBy(desc(reports.createdAt), reports.id));
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (typeof id !== 'string' || !id) {
      return Response.json({ error: 'Missing report id' }, { status: 400 });
    }

    if (body.action === 'ack_wording') {
      // The server recomputes the flags itself and stores their signature: wording the resident was never shown cannot be confirmed.
      const [row] = await db.select().from(reports).where(eq(reports.id, id));
      if (!row) return Response.json({ error: 'Report not found' }, { status: 404 });
      if (row.status !== 'DRAFT') return Response.json({ error: `Not allowed while the case is ${row.status}` }, { status: 409 });
      return guardedUpdate(id, { wordingAck: wordingSignature(checkWording(row)) }, eq(reports.status, 'DRAFT'));
    }

    if (body.action !== undefined) {
      const action = Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
      if (!action) return Response.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
      return guardedUpdate(id, action.set, action.from ? eq(reports.status, action.from) : undefined);
    }

    // Whitelisted fields only: status, archive and audit fields move through explicit actions.
    const patch: Partial<NewReport> & Record<string, unknown> = pickEditable(body);
    const invalid = Object.keys(patch).find((key) => !isValidValue(key, patch[key]));
    if (invalid) return Response.json({ error: `Invalid value for ${invalid}` }, { status: 400 });
    if (patch.findingsJson !== undefined) {
      const sections = strictFindings(patch.findingsJson);
      if (!sections) {
        return Response.json({ error: 'findingsJson must be [{title, items:[{structure, content}]}]' }, { status: 400 });
      }
      patch.findingsMarkdown = findingsToMarkdown(sections);
    }
    // The letterhead / sign-off profile a case prints with: only ever a sanitised, complete profile.
    if (patch.institutionJson !== undefined) {
      const parsed = typeof patch.institutionJson === 'string' ? safeParse(patch.institutionJson) : null;
      if (!parsed) return Response.json({ error: 'Invalid value for institutionJson' }, { status: 400 });
      patch.institutionJson = JSON.stringify(sanitizeProfile(parsed));
    }
    return guardedUpdate(id, patch, notInArray(reports.status, [...LOCKED_STATUSES]));
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

/** Compat alias for the archive action (flag only; nothing is deleted). */
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Missing report id' }, { status: 400 });
    return guardedUpdate(id, ACTIONS.archive.set);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};
