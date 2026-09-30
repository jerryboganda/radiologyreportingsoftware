import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const filename = params.file;
    if (!filename) {
      return new Response('File parameter missing', { status: 400 });
    }

    const cleanFilename = path.basename(filename);
    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads', cleanFilename),
      path.resolve(process.cwd(), 'public', 'assets', cleanFilename),
      path.resolve(process.cwd(), 'public', 'assets', 'sample_note.png')
    ];

    let targetPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        targetPath = p;
        break;
      }
    }

    if (!targetPath) {
      return new Response('Not found', { status: 404 });
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
