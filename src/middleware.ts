// Gate for every page and API route (static JS/CSS and the public crests are served before this runs):
//  1. HTTP Basic Auth when BASIC_AUTH_PASS is set (patient data must never be open on the internet).
//  2. Same-origin check on state-changing requests, so another website cannot make a signed-in browser POST here.
//  3. No caching of anything dynamic (note photos and reports must never sit in a shared cache such as Cloudflare's).
import { defineMiddleware } from 'astro:middleware';
import { authEnabled, credentialsMatch } from './lib/auth';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const plain = (status: number, text: string, headers: Record<string, string> = {}) =>
  new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers } });

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  // Liveness probe for the container health check: reveals nothing.
  if (url.pathname === '/api/health') return plain(200, 'ok');

  if (!credentialsMatch(request.headers.get('authorization'))) {
    return plain(401, 'Sign in required', { 'WWW-Authenticate': 'Basic realm="PolytronX Radiology", charset="UTF-8"' });
  }

  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    if (origin) {
      // Behind the reverse proxy the public host arrives in X-Forwarded-Host; the browser's Origin must match it.
      const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        // "null" or malformed: treated as cross-origin below
      }
      if (!originHost || originHost !== host) return plain(403, 'Cross-origin request blocked');
    }
  }

  const response = await next();
  const secured = new Response(response.body, response);
  secured.headers.set('Cache-Control', 'private, no-store');
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Referrer-Policy', 'same-origin');
  if (authEnabled) secured.headers.set('Vary', 'Authorization');
  return secured;
});
