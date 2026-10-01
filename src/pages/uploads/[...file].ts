import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';
import { UPLOADS_DIR } from '../../lib/ingest';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const notFound = () => new Response('Not found', { status: 404 });

/** Serves note photos from the uploads dir only: image types only, no subpaths, no fallback image. */
export const GET: APIRoute = async ({ params }) => {
  const filename = params.file ?? '';
  const contentType = MIME_TYPES[path.extname(filename).toLowerCase()];
  if (!contentType || path.basename(filename) !== filename) return notFound();

  const buffer = await fs.promises.readFile(path.join(UPLOADS_DIR, filename)).catch(() => null);
  if (!buffer) return notFound();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': buffer.length.toString(),
      'X-Content-Type-Options': 'nosniff'
    }
  });
};
