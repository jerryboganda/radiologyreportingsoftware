import type { APIRoute } from 'astro';

// Answered by the middleware before auth; this route only makes /api/health a real path.
export const GET: APIRoute = () => new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
