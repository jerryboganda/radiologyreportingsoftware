import type { APIRoute } from 'astro';
import { createPendingDraft } from '../../lib/ingest';
import { studyLabel } from '../../lib/studies';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** New case from typed or dictated positive findings plus optional biodata (Create Report): no photo, queued at once. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const b = (await request.json().catch(() => null)) ?? {};
    const sourceText = clean(b.sourceText, 20_000);
    if (!sourceText) return Response.json({ error: 'The findings are empty' }, { status: 400 });
    const gender = clean(b.gender, 10);
    const row = await createPendingDraft('', {
      patientName: clean(b.patientName, 120),
      age: clean(b.age, 30),
      gender: gender === 'Male' || gender === 'Female' ? gender : '',
      modality: studyLabel(clean(b.modality, 60), clean(b.region, 120)),
      region: clean(b.region, 120) || null,
      sourceText,
    });
    return Response.json(row);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: error.status ?? 500 });
  }
};
