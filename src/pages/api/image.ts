import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp'
};

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const requestedFile = url.searchParams.get('file') || url.searchParams.get('path');
    if (!requestedFile) {
      // Default to sample_note.png
      const defaultNote = path.resolve(process.cwd(), 'public', 'assets', 'sample_note.png');
      if (fs.existsSync(defaultNote)) {
        const buffer = fs.readFileSync(defaultNote);
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': buffer.length.toString()
          }
        });
      }
      return new Response('File parameter missing', { status: 400 });
    }

    const cleanFilename = path.basename(requestedFile);

    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads', cleanFilename),
      path.resolve(process.cwd(), 'public', 'assets', cleanFilename),
      path.resolve(process.cwd(), 'public', cleanFilename),
      path.resolve(process.cwd(), 'dist', 'client', 'assets', cleanFilename),
      path.resolve(process.cwd(), '..', cleanFilename),
      path.resolve(requestedFile)
    ];

    let targetPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        targetPath = p;
        break;
      }
    }

    if (!targetPath) {
      const fallback = path.resolve(process.cwd(), 'public', 'assets', 'sample_note.png');
      if (fs.existsSync(fallback)) {
        targetPath = fallback;
      } else {
        return new Response('Image not found', { status: 404 });
      }
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(targetPath);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
