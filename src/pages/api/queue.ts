import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../db';
import { reports } from '../../db/schema';
import { eq } from 'drizzle-orm';

const QUEUE_FILE = path.resolve(process.cwd(), 'data', 'ai_queue.json');
const MAX_HISTORY = 50;

interface QueueJob {
  id: string;
  reportId: string;
  tokenNumber: string;
  patientName: string;
  imagePath: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
}

interface QueueData {
  version: string;
  updatedAt: string;
  jobs: QueueJob[];
}

function readQueue(): QueueData {
  try {
    if (!fs.existsSync(QUEUE_FILE)) {
      const initial: QueueData = { version: '1.0', updatedAt: new Date().toISOString(), jobs: [] };
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(QUEUE_FILE, 'utf-8');
    return JSON.parse(content) as QueueData;
  } catch (err) {
    console.error('Error reading queue file:', err);
    return { version: '1.0', updatedAt: new Date().toISOString(), jobs: [] };
  }
}

function writeQueue(data: QueueData) {
  try {
    // Retain up to MAX_HISTORY completed/failed jobs
    const activeJobs = data.jobs.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING');
    const pastJobs = data.jobs
      .filter(j => j.status === 'COMPLETED' || j.status === 'FAILED')
      .slice(-MAX_HISTORY);

    data.jobs = [...activeJobs, ...pastJobs];
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing queue file:', err);
  }
}

// GET /api/queue - Get queue status & active jobs
export const GET: APIRoute = async () => {
  try {
    const queueData = readQueue();
    const pendingCount = queueData.jobs.filter(j => j.status === 'PENDING').length;
    const processingCount = queueData.jobs.filter(j => j.status === 'PROCESSING').length;
    const completedCount = queueData.jobs.filter(j => j.status === 'COMPLETED').length;

    return new Response(JSON.stringify({
      success: true,
      pendingCount,
      processingCount,
      completedCount,
      totalActive: pendingCount + processingCount,
      jobs: queueData.jobs,
      updatedAt: queueData.updatedAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/queue - Enqueue single note or batch enqueue all pending
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, reportId } = body;

    const queueData = readQueue();
    const now = new Date().toISOString();
    let enqueuedJobs: QueueJob[] = [];

    if (action === 'enqueue_single' && reportId) {
      // Find report in DB
      const existing = await db.select().from(reports).where(eq(reports.id, reportId));
      if (existing.length === 0) {
        return new Response(JSON.stringify({ error: 'Report not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const rep = existing[0];
      // Check if already in active queue
      const alreadyQueued = queueData.jobs.some(
        j => j.reportId === reportId && (j.status === 'PENDING' || j.status === 'PROCESSING')
      );

      if (!alreadyQueued) {
        const newJob: QueueJob = {
          id: `job-${crypto.randomUUID()}`,
          reportId: rep.id,
          tokenNumber: rep.tokenNumber,
          patientName: rep.patientName,
          imagePath: rep.imagePath,
          status: 'PENDING',
          createdAt: now
        };
        queueData.jobs.unshift(newJob);
        enqueuedJobs.push(newJob);

        // Update DB status to QUEUED
        await db.update(reports)
          .set({ status: 'QUEUED', updatedAt: new Date() })
          .where(eq(reports.id, reportId));
      }
    } else if (action === 'enqueue_all') {
      // Find all active un-archived reports
      const allReports = await db.select().from(reports);
      const activeReports = allReports.filter(r => !r.isArchived && r.status !== 'FINALIZED');

      for (const rep of activeReports) {
        const isQueued = queueData.jobs.some(
          j => j.reportId === rep.id && (j.status === 'PENDING' || j.status === 'PROCESSING')
        );
        if (!isQueued) {
          const newJob: QueueJob = {
            id: `job-${crypto.randomUUID()}`,
            reportId: rep.id,
            tokenNumber: rep.tokenNumber,
            patientName: rep.patientName,
            imagePath: rep.imagePath,
            status: 'PENDING',
            createdAt: now
          };
          queueData.jobs.push(newJob);
          enqueuedJobs.push(newJob);

          await db.update(reports)
            .set({ status: 'QUEUED', updatedAt: new Date() })
            .where(eq(reports.id, rep.id));
        }
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Specify enqueue_single or enqueue_all' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    writeQueue(queueData);

    return new Response(JSON.stringify({
      success: true,
      enqueuedCount: enqueuedJobs.length,
      jobs: enqueuedJobs,
      message: enqueuedJobs.length > 0
        ? `Successfully added ${enqueuedJobs.length} note(s) to AI - Generation queue.`
        : 'All requested notes are already in the AI - Generation queue.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Queue POST error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
