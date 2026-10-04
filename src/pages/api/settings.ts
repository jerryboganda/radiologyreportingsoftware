import type { APIRoute } from 'astro';
import { db } from '../../db';
import { settings } from '../../db/schema';
import { readInstitution, resetInstitution, saveInstitution } from '../../lib/institutionStore';

export const ENGINES = ['antigravity', 'opencode'] as const;
export type Engine = (typeof ENGINES)[number];

const DEFAULTS: Record<Engine, string> = {
  antigravity: 'gemini-3.8-flash-high',
  opencode: 'deepseek-v4.1-flash',
};

async function readEngineModel() {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value ?? '']));
  const engine = (map.get('engine') || 'antigravity') as Engine;
  const model = map.get('model') || DEFAULTS[ENGINES.includes(engine) ? engine : 'antigravity'];
  // The reasoning effort is optional: '' means the model's own default.
  const variant = map.get('variant') ?? '';
  return { engine: ENGINES.includes(engine) ? engine : 'antigravity', model, variant };
}

const current = async () => ({ ...(await readEngineModel()), institution: await readInstitution() });

export const GET: APIRoute = async () => Response.json(await current());

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) ?? {};

    // The letterhead / sign-off profile, edited here or in place on the report sheet.
    if (body.resetInstitution === true) {
      await resetInstitution();
      return Response.json(await current());
    }
    if (body.institution && typeof body.institution === 'object') {
      await saveInstitution(body.institution);
      return Response.json(await current());
    }

    const engine = String(body.engine ?? '');
    const model = String(body.model ?? '').trim();
    const variant = String(body.variant ?? '').trim().slice(0, 40);
    if (!(ENGINES as readonly string[]).includes(engine)) {
      return Response.json({ error: `Engine must be one of: ${ENGINES.join(', ')}` }, { status: 400 });
    }
    if (!model) return Response.json({ error: 'Model is required' }, { status: 400 });
    for (const [key, value] of [
      ['engine', engine],
      ['model', model],
      ['variant', variant],
    ]) {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    }
    return Response.json(await current());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};