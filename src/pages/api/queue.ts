import type { APIRoute } from 'astro';
import { and, eq, inArray, lt, or } from 'drizzle-orm';
import { db } from '../../db';
import { reports, type NewReport } from '../../db/schema';
import { QUEUEABLE_STATUSES, isBlankDraft, validateWorkerResult, workerResultToColumns, type ReportStatus, type WorkerResult } from '../../lib/report';
import { guardedUpdate } from '../../lib/ingest';

// The reports table is the queue. Worker liveness lives in memory only (it drives the UI's online pill).
let workerLastSeen: number | null = null;
let workerBusy = false;
let workerEngine: string | null = null;
let workerModel: string | null = null;
let workerModels: string[] = [];
let workerModelVariants: Record<string, string[]> = {};

/** Engine self-test requested from the app, awaiting the worker; delivered via heartbeat. */
let pendingTest: { engine: string; model: string; variant: string } | null = null;
/** The worker's last self-test outcome (from the app Settings' Test connection button). */
let lastTest: { engine: string; model: string; variant: string; ok: boolean; detail: string; at: number } | null = null;
let modelsRefreshRequested = false;

/** A PROCESSING case untouched this long is reclaimed; the worker's own job timeout is 10 min. */
const STALE_MS = 15 * 60 * 1000;
const REQUEUE: Partial<NewReport> = { status: 'QUEUED', auditStatus: 'PENDING', lastError: null };

export const GET: APIRoute = () => Response.json({ workerLastSeen, workerBusy, workerEngine, workerModel, workerModels, workerModelVariants, lastTest, pendingTest: Boolean(pendingTest), modelsRefreshRequested });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) ?? {};
    const reportId = String(body.reportId ?? '');
    if (['claim', 'complete', 'fail', 'heartbeat'].includes(body.action)) workerLastSeen = Date.now();

    switch (body.action) {
      case 'heartbeat':
        workerBusy = Boolean(body.busy);
        if (typeof body.engine === 'string') workerEngine = body.engine;
        if (typeof body.model === 'string') workerModel = body.model;
        if (Array.isArray(body.models)) workerModels = body.models.filter((m: unknown) => typeof m === 'string');
        if (body.modelVariants && typeof body.modelVariants === 'object') {
          workerModelVariants = Object.fromEntries(
            Object.entries(body.modelVariants as Record<string, unknown>).filter(
              ([, v]) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
            ),
          ) as Record<string, string[]>;
        }
        // Deliver queued requests to the worker, once, then clear them.
        const reply = { ok: true, test: pendingTest, refreshModels: modelsRefreshRequested };
        pendingTest = null;
        modelsRefreshRequested = false;
        return Response.json(reply);

      case 'request_test': {
        const engine = String(body.engine ?? '');
        const model = String(body.model ?? '');
        if (!engine || !model) return Response.json({ error: 'engine and model required' }, { status: 400 });
        pendingTest = { engine, model, variant: String(body.variant ?? '') };
        return Response.json({ ok: true });
      }

      case 'fetch_models':
        modelsRefreshRequested = true;
        return Response.json({ ok: true });

      case 'test_result':
        lastTest = { engine: String(body.engine ?? ''), model: String(body.model ?? ''), variant: String(body.variant ?? ''), ok: Boolean(body.ok), detail: String(body.detail ?? '').slice(0, 500), at: Date.now() };
        pendingTest = null;
        return Response.json({ ok: true });

      case 'claim':
        return claim();

      case 'complete': {
        workerBusy = false;
        const [row] = await db.select({ status: reports.status }).from(reports).where(eq(reports.id, reportId));
        if (!row) return Response.json({ error: 'Report not found' }, { status: 404 });
        if (row.status !== 'PROCESSING') {
          return Response.json({ error: `Case is ${row.status}, not PROCESSING` }, { status: 409 });
        }
        const errors = validateWorkerResult(body.result);
        if (errors.length) return Response.json({ errors }, { status: 422 });
        return guardedUpdate(reportId, workerResultToColumns(body.result as WorkerResult), eq(reports.status, 'PROCESSING'));
      }

      case 'fail':
        workerBusy = false;
        return guardedUpdate(
          reportId,
          { status: 'FAILED', lastError: String(body.error || 'Unknown worker error').slice(0, 2000) },
          eq(reports.status, 'PROCESSING'),
        );

      case 'enqueue': {
        const [row] = await db.select().from(reports).where(eq(reports.id, reportId));
        if (!row) return Response.json({ error: 'Report not found' }, { status: 404 });
        if (!QUEUEABLE_STATUSES.includes(row.status as ReportStatus)) {
          return Response.json({ error: `A ${row.status} case cannot be queued` }, { status: 409 });
        }
        if (row.status === 'DRAFT' && !isBlankDraft(row) && !body.force) {
          return Response.json({ error: 'This draft has content that regenerating would replace', needsConfirm: true }, { status: 409 });
        }
        return guardedUpdate(reportId, REQUEUE, eq(reports.status, row.status as ReportStatus));
      }

      case 'retry_failed': {
        const retryable = inArray(reports.status, ['FAILED', 'DRAFT']);
        const candidates = await db.select().from(reports).where(and(eq(reports.isArchived, false), retryable));
        const ids = candidates.filter((r) => r.status === 'FAILED' || isBlankDraft(r)).map((r) => r.id);
        const requeued = ids.length
          ? await db.update(reports).set({ ...REQUEUE, updatedAt: new Date() }).where(and(inArray(reports.id, ids), retryable)).returning({ id: reports.id })
          : [];
        return Response.json({ count: requeued.length });
      }

      default:
        return Response.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

/** Oldest non-archived QUEUED case (or an abandoned PROCESSING one), claimed by one UPDATE … RETURNING statement. */
async function claim() {
  const claimable = and(
    eq(reports.isArchived, false),
    or(
      eq(reports.status, 'QUEUED'),
      and(eq(reports.status, 'PROCESSING'), lt(reports.updatedAt, new Date(Date.now() - STALE_MS))),
    ),
  );
  const oldest = db.select({ id: reports.id }).from(reports).where(claimable).orderBy(reports.createdAt).limit(1);
  const [report] = await db
    .update(reports)
    .set({ status: 'PROCESSING', updatedAt: new Date() })
    .where(and(inArray(reports.id, oldest), claimable))
    .returning();
  workerBusy = Boolean(report);
  return Response.json({ report: report ?? null });
}
