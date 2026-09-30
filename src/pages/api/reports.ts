import type { APIRoute } from 'astro';
import { db } from '../../db';
import { reports } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  try {
    const allReports = await db.select().from(reports).orderBy(desc(reports.updatedAt));
    return new Response(JSON.stringify(allReports), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing report id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.update(reports).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(reports.id, id));

    const updated = await db.select().from(reports).where(eq(reports.id, id));

    return new Response(JSON.stringify(updated[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
