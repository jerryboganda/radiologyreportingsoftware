// AI worker: claims queued cases from the app, has the Antigravity CLI (agy) read each note photo under the
// live AGENTS.md, and posts the structured result back. One job at a time, no automatic retries.
// Runs on the Windows host (`npm run worker`); Node built-ins only.
//   APP_URL          app base URL (default http://localhost:4321)
//   APP_BASIC_AUTH   "user:password" when the app sits behind the password gate (production)
//                    A remote APP_URL also makes the worker download each note photo over HTTPS instead of reading uploads/.
//   AGY_BIN          agy executable (default %LOCALAPPDATA%\agy\bin\agy.exe)
//   UPLOADS_DIR      where /uploads/<name> lives (default <root>/uploads)
//   AGY_FAKE_RESULT  test seam: a JSON file used as agy's output instead of running agy
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = (process.env.APP_URL || 'http://localhost:4321').replace(/\/+$/, '');
// The installer has shipped agy.exe, an agy.cmd shim and an extensionless binary at different times.
const AGY_DIR = path.join(process.env.LOCALAPPDATA || '', 'agy', 'bin');
const AGY_BIN = process.env.AGY_BIN || ['agy.exe', 'agy.cmd', 'agy'].map((f) => path.join(AGY_DIR, f)).find((p) => fs.existsSync(p)) || path.join(AGY_DIR, 'agy.exe');
const AGY_FAKE_RESULT = process.env.AGY_FAKE_RESULT;
// A password-protected app (production): APP_BASIC_AUTH="user:password".
const AUTH_HEADER = process.env.APP_BASIC_AUTH ? { Authorization: `Basic ${Buffer.from(process.env.APP_BASIC_AUTH).toString('base64')}` } : {};
// Only a worker on the same PC as the app may read note photos from the local uploads folder; a remote app's photos are downloaded.
const APP_IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(APP_URL).hostname);
const MODEL = 'gemini-3.8-flash-high'; // owner rule: always Gemini 3.8 Flash, High thinking. Deliberately not configurable.
// A full report on Gemini 3.8 Flash (High) took 290 s in the first real run; the app reclaims a stuck case after 15 min.
const JOB_TIMEOUT_MS = 10 * 60 * 1000;
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(ROOT, 'uploads'));
const WORK_DIR = path.join(ROOT, '.worker'); // inside the project root, so agy's paths never contain spaces
const ENVELOPE_KEYS = ['response', 'result', 'text', 'output', 'content'];

let job = null; // { id, child } while a case is being processed

const log = (msg) => console.log(`${new Date().toLocaleTimeString()} [worker] ${msg}`);

async function post(body) {
  const res = await fetch(`${APP_URL}/api/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${body.action}: HTTP ${res.status} ${JSON.stringify(data.errors ?? data.error ?? data)}`);
  return data;
}

const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Remote app: fetches '/uploads/<name>' over HTTPS into the work folder. Returns the local file path. */
async function downloadImage(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) return null;
  const res = await fetch(`${APP_URL}${encodeURI(imagePath)}`, { headers: AUTH_HEADER, signal: AbortSignal.timeout(60_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`could not download the note photo: HTTP ${res.status}`);
  const ext = IMAGE_EXT[(res.headers.get('content-type') || '').split(';')[0].trim()];
  if (!ext) throw new Error(`the note photo download was not an image (${res.headers.get('content-type')})`);
  const file = path.join(WORK_DIR, `download${ext}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/** '/uploads/<name>' → the local file, or null. The raw name is tried first (input/ imports keep raw names). */
function resolveImage(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) return null;
  const raw = imagePath.slice('/uploads/'.length);
  const names = [raw];
  try {
    names.push(decodeURIComponent(raw));
  } catch {
    // a raw name containing '%'
  }
  return names.map((n) => path.join(UPLOADS_DIR, path.basename(n))).find((f) => fs.existsSync(f)) ?? null;
}

function buildPrompt(report, imageRel) {
  const rulebook = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'); // read per job, so owner edits apply at once
  const notes = report.ownerNotes?.trim();
  const corrections = notes && `
---

## OWNER CORRECTIONS (highest authority, AGENTS.md Section 2 source 1)

The owner typed these corrections and details for this case. Where they conflict with the handwritten note, they win. Log each one in verification section D.

${notes}
`;
  const task = `
---

## AUTOMATED PIPELINE TASK (overrides the Section 11 outputs only; Sections 2 and 3 apply in full)

You are running inside the reporting app's automated pipeline, not a chat. The resident reviews every result in the app before anything is signed.

- Process exactly one case: the handwritten note photo \`${imageRel}\` in the working directory. Read it with your own vision and follow Sections 5, 6, 8, 9 and 10.
- Do not print "Rulebook loaded.". Do not create, modify, rename or delete any file (no \`output/\` files). This block replaces the file and chat output of Sections 4, 5 (steps 9 and 10) and 11. Do not use web search or any other external service.
- Return ONE JSON object and nothing else (no prose, no code fences), matching \`scripts/report.schema.json\`:
  - Header fields (patientName, age, gender, tokenNumber, mrNumber, modality, studyDate, referringClinician, clinicalHistory, comparison): copy them exactly as written (H13). Use "" for anything not written in the source; never invent, complete or correct them. The app prints "Not stated in source" for "".
    Two fields are the exception because they are printed in the report header: modality is the study in professional wording with every abbreviation expanded (written "CECT Abd + Pelvis" becomes "Contrast-enhanced CT of the Abdomen and Pelvis"; add no contrast, region, phase or detail the note does not write), and studyDate is ISO YYYY-MM-DD when the note gives a full date (converted, never altered), otherwise exactly as written. Section A of the verification sheet keeps both exactly as written.
  - verbatimTranscription: the Section 6.1 transcription, line by line, with [?] markers and crossed-out text noted.
  - verificationSheet: the Section 11.2 VERIFY content as plain text, starting with its STATUS line. Section A says "Not stated in source" for every absent variable.
  - isUrgent: true only if a finding from the Section 9.4 urgent list is written in the note. urgentFindings: those written findings in one or two sentences of report wording, otherwise "". Never state that anyone was called or informed: only the resident logs calls.
- If any critical ambiguity remains after the Section 6.4 triage, or the photo is blurred, cropped, unreadable, not a radiology note, or holds more than one case: set status "BLOCKED". Fill the header fields that are readable, verbatimTranscription, and a verificationSheet that starts with "STATUS: BLOCKED" and whose section H holds every CLARIFICATION NEEDED question in the Section 6.4 format. Leave technique "", findings [], impression [] and recommendations [].
- Otherwise set status "READY" and return the full Section 7 report body, after the Section 10 audit passes:
  - technique: the Section 7.2 line.
  - findings: one entry per Section 7.3 region or system, in checklist order (a small single-region study uses one entry titled with its region). Each structure bullet is one item {structure, content, isAbnormal}; write its sub-bullets (written attributes, associated findings, same-organ normal statements) as further sentences of the same content. isAbnormal is true for finding-ledger rows and false for normal-by-convention statements.
  - impression: the Section 9.3 items in order, without numbering.
  - recommendations: the Section 9.4 items in order, without bullets. Never empty: use "Clinical correlation is advised." when nothing specific applies.
  - verificationSheet starts with "STATUS: READY".
`;
  return [rulebook, corrections, task].filter(Boolean).join('\n');
}

// Confirmed on agy 1.2.14 (2 Oct 2026): `@path` attaches the note image, `-p` prints non-interactively,
// `--json-schema <file>` returns the checked object in `structured_output`.
function agyArgs(imageRel) {
  return [
    '-p', `Follow the instructions in @.worker/prompt.md exactly. The handwritten note image is @${imageRel}. Output only the JSON object.`,
    '--model', MODEL,
    '--output-format', 'json',
    '--json-schema', 'scripts/report.schema.json',
  ];
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill('SIGKILL');
}

function runAgy(imageRel) {
  const args = agyArgs(imageRel);
  // A .cmd/.bat shim needs a shell. These args are fixed strings without quotes or % signs, so plain quoting is safe.
  const child = /\.(cmd|bat)$/i.test(AGY_BIN)
    ? spawn([AGY_BIN, ...args].map((a) => `"${a}"`).join(' '), { cwd: ROOT, shell: true, windowsHide: true })
    : spawn(AGY_BIN, args, { cwd: ROOT, windowsHide: true });
  job.child = child;
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (d) => (stdout += d));
    child.stderr.setEncoding('utf8').on('data', (d) => (stderr += d));
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, JOB_TIMEOUT_MS);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const tail = stderr.trim().slice(-500);
      if (timedOut) reject(new Error(`agy timed out after ${JOB_TIMEOUT_MS / 60_000} min`));
      else if (code !== 0) reject(new Error(`agy exited with code ${code}${tail ? `: ${tail}` : ''}`));
      else resolve(stdout);
    });
  });
}

function tryJson(text) {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The first balanced {...} block in free text (string-aware), or null. */
function firstObject(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * agy's output → the result object. Verified against agy 1.2.14 (`--output-format json --json-schema`):
 * {conversation_id, status:"SUCCESS", response:"<json text>", structured_output:{…}, usage…}.
 * `structured_output` is the schema-checked object; `response` can carry extra tool-trace keys, so it is only a fallback.
 * Plain JSON, other envelopes and JSON inside prose/code fences are still accepted (and the test seam uses them).
 */
function parseResult(output) {
  let value = tryJson(output) ?? tryJson(firstObject(output));
  if (typeof value?.status === 'string' && 'structured_output' in value) {
    if (value.status !== 'SUCCESS') throw new Error(`agy reported ${value.status}: ${String(value.response ?? value.error ?? '').trim().slice(0, 300)}`);
    if (value.structured_output && typeof value.structured_output === 'object' && !Array.isArray(value.structured_output)) return value.structured_output;
  }
  for (const key of ENVELOPE_KEYS) {
    const inner = value?.[key];
    if (typeof inner === 'string') {
      value = tryJson(inner) ?? tryJson(firstObject(inner));
      break;
    }
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      value = inner;
      break;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`agy output held no JSON object: ${output.trim().slice(0, 300)}`);
  }
  return value;
}

function cleanWorkDir() {
  for (const f of fs.readdirSync(WORK_DIR)) {
    if (f.startsWith('current') || f.startsWith('download')) fs.rmSync(path.join(WORK_DIR, f), { force: true });
  }
}

async function runJob(report) {
  const tag = report.id.slice(0, 8); // ids only in logs, never patient details
  const started = Date.now();
  job = { id: report.id, child: null };
  log(`${tag}: claimed`);
  try {
    const image = APP_IS_LOCAL ? resolveImage(report.imagePath) : await downloadImage(report.imagePath);
    if (!image) throw new Error('Source image missing');
    const imageRel = `.worker/current${path.extname(image).toLowerCase()}`;
    fs.copyFileSync(image, path.join(ROOT, imageRel));
    fs.writeFileSync(path.join(WORK_DIR, 'prompt.md'), buildPrompt(report, imageRel));
    const output = AGY_FAKE_RESULT ? fs.readFileSync(AGY_FAKE_RESULT, 'utf8') : await runAgy(imageRel);
    const saved = await post({ action: 'complete', reportId: report.id, result: parseResult(output) });
    log(`${tag}: ${saved.status} in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (err) {
    const reason = String(err?.message || err).slice(0, 2000);
    log(`${tag}: FAILED: ${reason.split('\n')[0].slice(0, 200)}`);
    await post({ action: 'fail', reportId: report.id, error: reason }).catch((e) => log(`${tag}: could not record the failure: ${e.message}`));
  } finally {
    job = null;
    cleanWorkDir();
  }
}

// Stopping mid-job marks the case FAILED (Retry in the app) instead of leaving it PROCESSING for 15 min.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (job) {
      if (job.child) killTree(job.child);
      log(`${job.id.slice(0, 8)}: stopped mid-job, marking it failed`);
      await post({ action: 'fail', reportId: job.id, error: 'Worker stopped mid-job' }).catch(() => {});
    }
    process.exit(130);
  });
}

if (!AGY_FAKE_RESULT && !fs.existsSync(AGY_BIN)) {
  console.error(`[worker] Antigravity CLI not found at ${AGY_BIN}; install Antigravity / set AGY_BIN`);
  process.exit(1);
}

fs.mkdirSync(WORK_DIR, { recursive: true });
cleanWorkDir();
log(`polling ${APP_URL} with ${MODEL} via ${AGY_FAKE_RESULT ? `FAKE result ${AGY_FAKE_RESULT}` : AGY_BIN}`);

const heartbeat = () => post({ action: 'heartbeat', busy: Boolean(job) }).catch(() => {});
heartbeat();
setInterval(heartbeat, 5000);

let lastProblem = '';
for (;;) {
  let report = null;
  try {
    ({ report } = await post({ action: 'claim' }));
    lastProblem = '';
  } catch (err) {
    if (err.message !== lastProblem) log(`cannot claim from ${APP_URL}: ${err.message}`);
    lastProblem = err.message;
  }
  if (report) await runJob(report);
  else await sleep(3000);
}
