// Access-control check, Node built-ins only. Read-only apart from rejected writes, so it is safe to point at production:
//   AUTH_USER=radiology AUTH_PASS=... node scripts/auth-check.mjs https://radiology.polytronx.com
// The server must run with BASIC_AUTH_PASS set; this proves nothing but /api/health answers without the password.
import assert from 'node:assert/strict';

const BASE = (process.argv[2] || 'http://127.0.0.1:4399').replace(/\/+$/, '');
const USER = process.env.AUTH_USER || 'radiology';
const PASS = process.env.AUTH_PASS;
assert.ok(PASS, 'set AUTH_PASS to the production password');
const good = { Authorization: `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}` };
const bad = { Authorization: `Basic ${Buffer.from(`${USER}:wrong-${PASS}`).toString('base64')}` };
const host = new URL(BASE).host;

const status = async (path, init = {}) => (await fetch(BASE + path, { redirect: 'manual', ...init })).status;
const ok = (name) => console.log(`✓ ${name}`);

assert.equal(await status('/api/health'), 200);
ok('/api/health answers without a password');

for (const path of ['/', '/api/reports', '/api/queue', '/uploads/anything.jpg', '/print/anything', '/api/pdf/anything']) {
  assert.equal(await status(path), 401, `${path} without credentials`);
  assert.equal(await status(path, { headers: bad }), 401, `${path} with a wrong password`);
}
ok('pages, API, uploads, print and PDF all refuse no/wrong credentials (401)');

const challenge = (await fetch(BASE + '/', { redirect: 'manual' })).headers.get('www-authenticate') ?? '';
assert.match(challenge, /^Basic realm=/);
ok('401 carries a Basic challenge so browsers show the sign-in prompt');

assert.equal(await status('/api/reports', { headers: good }), 200);
const page = await fetch(BASE + '/', { headers: good, redirect: 'manual' });
assert.equal(page.status, 200);
assert.match(page.headers.get('cache-control') ?? '', /no-store/);
assert.equal(page.headers.get('x-frame-options'), 'DENY');
ok('correct credentials work; pages are no-store, frame-denied');

const post = (origin) =>
  fetch(BASE + '/api/queue', { method: 'POST', headers: { ...good, 'Content-Type': 'text/plain', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify({ action: 'heartbeat' }) });
assert.equal((await post('https://evil.example')).status, 403);
assert.equal((await post('null')).status, 403);
assert.equal((await post(`${new URL(BASE).protocol}//${host}`)).status, 200);
assert.equal((await post(undefined)).status, 200);
ok('cross-site POST (even with valid credentials) is blocked; same-origin and header-less (worker) POSTs pass');

console.log('\nall access-control checks passed');
