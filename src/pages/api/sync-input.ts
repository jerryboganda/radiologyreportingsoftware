import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';
import { db } from '../../db';
import { reports } from '../../db/schema';
import { IMAGE_TYPES, INPUT_DIR, UPLOADS_DIR, createPendingDraft } from '../../lib/ingest';

/** Imports new photos from input/ as queued blank drafts. Files keep their raw names, which is how duplicates are spotted. */
export const POST: APIRoute = async () => {
  try {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const existing = await db.select({ imagePath: reports.imagePath }).from(reports);
    const imported = new Set(existing.map((r) => path.basename(r.imagePath)));

    let importedCount = 0;
    for (const file of fs.readdirSync(INPUT_DIR)) {
      if (!IMAGE_TYPES[path.extname(file).toLowerCase()] || imported.has(file)) continue;
      const dest = path.join(UPLOADS_DIR, file);
      if (!fs.existsSync(dest)) fs.copyFileSync(path.join(INPUT_DIR, file), dest);
      await createPendingDraft(`/uploads/${file}`);
      importedCount++;
    }

    return Response.json({
      importedCount,
      message: importedCount > 0
        ? `Imported ${importedCount} note(s) from input/; they are queued for the AI.`
        : 'No new notes in input/.',
    });
  } catch (error: any) {
    console.error('Error syncing input folder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
