import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { settings } from '../../db/schema';

export const ENGINES = ['antigravity', 'opencode'] as const;
export type Engine = (typeof ENGINES)[number];

const DEFAULTS: Record<Engine, string> = {
  antigravity: 'gemini-3.8-flash-high',
  opencode: 'opencode-go/deepseek-v4-flash-vision-exp',
};

async function readAll() {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value ?? '']));
  const engine = (map.get('engine') || 'antigravity') as Engine;
  const model = map.get('model') || DEFAULTS[ENGINES.includes(engine) ? engine : 'antigravity'];
  return { engine: ENGINES.includes(engine) ? engine : 'antigravity', model };
}

export const GET: APIRoute = async () => Response.json(await readAll());

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) ?? {};
    const engine = String(body.engine ?? '');
    const model = String(body.model ?? '').trim();
    if (!(ENGINES as readonly string[]).includes(engine)) {
      return Response.json({ error: `Engine must be one of: ${ENGINES.join(', ')}` }, { status: 400 });
    }
    if (!model) return Response.json({ error: 'Model is required' }, { status: 400 });
    for (const [key, value] of [
      ['engine', engine],
      ['model', model],
    ]) {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    }
    return Response.json(await readAll());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};
