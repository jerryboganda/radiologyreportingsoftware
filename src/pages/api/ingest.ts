import type { APIRoute } from 'astro';
import { createPendingDraft, saveUpload } from '../../lib/ingest';

/** New case from a note photo: a blank draft, queued for the AI worker straight away. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const file = (await request.formData().catch(() => null))?.get('image');
    if (!(file instanceof File)) {
      return Response.json({ error: 'No image uploaded' }, { status: 400 });
    }
    const { url } = await saveUpload(file);
    return Response.json(await createPendingDraft(url));
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: error.status ?? 500 });
  }
};
