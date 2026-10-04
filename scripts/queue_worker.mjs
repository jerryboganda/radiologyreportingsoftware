// AI worker: claims queued cases from the app, has the selected engine (Antigravity `agy`
// CLI, or OpenCode over its gateway API) read each note photo under the live AGENTS.md, and
// posts the structured result back. One job at a time, no automatic retries.
// Runs on the Windows host (`npm run worker`); Node built-ins only.
//   APP_URL          app base URL (default http://localhost:4321)
//   APP_BASIC_AUTH   "user:password" when the app sits behind the password gate (production)
//                    A remote APP_URL also makes the worker download each note photo over HTTPS instead of reading uploads/.
//   AI_ENGINE        antigravity | opencode (default: the app's Settings, else antigravity)
//   AI_MODEL         model id (default: the app's Settings, else the engine default)
//   AGY_BIN          agy executable (default %LOCALAPPDATA%\agy\bin\agy.exe)
//   OPENCODE_API_KEY OpenCode Zen API key (default: the git-ignored opencode-gateway.key file)
//   UPLOADS_DIR      where /uploads/<name> lives (default <root>/uploads)
//   AGY_FAKE_RESULT / OPENCODE_FAKE_RESULT  test seams: use this file as the engine output
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = (process.env.APP_URL || 'http://localhost:4321').trim().replace(/\/+$/, '');
// The installer has shipped agy.exe, an agy.cmd shim and an extensionless binary at different times.
const AGY_DIR = path.join(process.env.LOCALAPPDATA || '', 'agy', 'bin');
const AGY_BIN = (process.env.AGY_BIN || ['agy.exe', 'agy.cmd', 'agy'].map((f) => path.join(AGY_DIR, f)).find((p) => fs.existsSync(p)) || path.join(AGY_DIR, 'agy.exe')).trim();
const AGY_FAKE_RESULT = process.env.AGY_FAKE_RESULT?.trim();
const OPENCODE_FAKE_RESULT = process.env.OPENCODE_FAKE_RESULT?.trim();
// A password-protected app (production): APP_BASIC_AUTH="user:password".
const AUTH_HEADER = process.env.APP_BASIC_AUTH ? { Authorization: `Basic ${Buffer.from(process.env.APP_BASIC_AUTH).toString('base64')}` } : {};
// Only a worker on the same PC as the app may read note photos from the local uploads folder; a remote app's photos are downloaded.
const APP_IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(APP_URL).hostname);
const ENGINE_DEFAULT_MODEL = {
  antigravity: 'gemini-3.8-flash-high', // owner rule: Antigravity always runs Gemini 3.8 Flash, High thinking.
  opencode: 'deepseek-v4.1-flash', // owner rule 4 Oct 2026: DeepSeek V4.1 Flash on the OpenCode gateway (no "-fast" id exists there).
};
const ALL_ENGINES = Object.keys(ENGINE_DEFAULT_MODEL);

// --- OpenCode gateway: direct HTTPS, no CLI. ---
// Which of the three endpoint families a model speaks is fixed by the OpenCode Go docs;
// every model left unlisted speaks chat completions.
const GATEWAY_BASE = 'https://opencode.ai/zen/go/v1';
const GATEWAY_RESPONSES = new Set(['grok-4.7', 'grok-4.6', 'gpt-6-luna', 'gpt-5.6-luna', 'muse-spark-1.3-contributor', 'muse-spark-1.2-contributor']);
const GATEWAY_MESSAGES = new Set(['minimax-m3', 'minimax-m2.7', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus']);
const GATEWAY_KEY_FILE = path.join(ROOT, 'opencode-gateway.key');
const LEGACY_MODEL_PREFIX = /^(opencode-go|opencode)\//;

function gatewayKey() {
  let key = process.env.OPENCODE_API_KEY?.trim() || '';
  if (!key) {
    try {
      key = fs.readFileSync(GATEWAY_KEY_FILE, 'utf8').trim();
    } catch {}
  }
  if (!key) throw new Error('OpenCode gateway key missing: set OPENCODE_API_KEY or put the key in opencode-gateway.key');
  return key;
}

/** Saved Settings may still carry the old CLI prefix (`opencode-go/...`); the gateway wants the bare id. */
function gatewayModelId(model) {
  return model.replace(LEGACY_MODEL_PREFIX, '');
}

/** One OpenCode gateway call → the assistant text. `image` is {mime, base64} or null. */
async function gatewayText(model, prompt, image, timeoutMs) {
  const id = gatewayModelId(model);
  const family = GATEWAY_RESPONSES.has(id) ? 'responses' : GATEWAY_MESSAGES.has(id) ? 'messages' : 'chat/completions';
  const dataUrl = image ? `data:${image.mime};base64,${image.base64}` : null;
  const promptPart = { type: 'text', text: prompt };
  const body =
    family === 'responses'
      ? { model: id, input: [{ role: 'user', content: [promptPart, ...(dataUrl ? [{ type: 'input_image', image_url: dataUrl }] : [])] }] }
      : family === 'messages'
        ? { model: id, max_tokens: 16384, messages: [{ role: 'user', content: [promptPart, ...(image ? [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } }] : [])] }] }
        : { model: id, messages: [{ role: 'user', content: [promptPart, ...(dataUrl ? [{ type: 'image_url', image_url: { url: dataUrl } }] : [])] }] };
  const res = await fetch(`${GATEWAY_BASE}/${family}`, {
    method: 'POST',
    // x-opencode-session: a stable id per conversation (here: one per call, since a job makes exactly one request);
    // the gateway uses it for routing and prompt caching (https://opencode.ai/docs/go/).
    headers: { Authorization: `Bearer ${gatewayKey()}`, 'Content-Type': 'application/json', 'x-opencode-session': randomUUID() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`opencode gateway HTTP ${res.status}: ${raw.trim().slice(0, 300)}`);
  return gatewayReplyText(tryJson(raw));
}

/** The assistant text out of the three gateway reply shapes (chat completions / responses / messages). */
function gatewayReplyText(reply) {
  const parts = [];
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(collect);
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && (key === 'text' || key === 'output_text' || key === 'content' || key === 'output')) parts.push(value);
      else if (typeof value === 'object') collect(value);
    }
  };
  collect(reply);
  return parts.join('\n');
}
const JOB_TIMEOUT_MS = 10 * 60 * 1000;
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(ROOT, 'uploads'));
// Scratch folder inside the project root (so CLI paths never contain spaces). A local and a production worker can run
// side by side on one PC, so a remote app gets its own folder and they never overwrite each other's files.
const WORK_REL = APP_IS_LOCAL ? '.worker' : '.worker-prod';
const WORK_DIR = path.join(ROOT, WORK_REL);
const ENVELOPE_KEYS = ['response', 'result', 'text', 'output', 'content'];

let job = null; // { id, child } while a case is being processed
let currentEngine = null;
let currentModel = null;
let currentVariant = '';

const EFFORT_SUFFIX = /-(low|medium|high|xhigh|max)$/;

/** Applies the saved reasoning effort to a model id (antigravity encodes effort in the id). */
function agyModelWithEffort(model, variant) {
  if (!variant) return model;
  return EFFORT_SUFFIX.test(model) ? model.replace(EFFORT_SUFFIX, `-${variant}`) : model;
}

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

/** The app's Settings (engine + model), or null when unreachable. */
async function readSettings() {
  try {
    const res = await fetch(`${APP_URL}/api/settings`, { headers: AUTH_HEADER, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data.engine === 'string' ? data : null;
  } catch {
    return null;
  }
}

export function resolveEngineModel(settings) {
  const explicitEngine = (process.env.AI_ENGINE || (process.argv.find((a) => a.startsWith('--engine=')) || '').split('=')[1] || '').trim().toLowerCase();
  const settingsEngine = String(settings?.engine ?? '').trim().toLowerCase();
  const engine = ALL_ENGINES.includes(explicitEngine)
    ? explicitEngine
    : ALL_ENGINES.includes(settingsEngine)
      ? settingsEngine
      : 'antigravity';
  const explicitModel = process.env.AI_MODEL?.trim();
  const model = explicitModel || (settingsEngine === engine && settings?.model ? String(settings.model).trim() : ENGINE_DEFAULT_MODEL[engine]);
  const variant = (process.env.AI_VARIANT || '').trim() || (settingsEngine === engine && typeof settings?.variant === 'string' ? settings.variant.trim() : '');
  return { engine, model, variant };
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

function buildPrompt(report) {
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

- Process exactly one case: the attached handwritten note photo. Read it with your own vision and follow Sections 5, 6, 8, 9 and 10.
- WORDING (owner ruling H28, applies to every report, always): use only the senior's own terms. Never replace a term the senior wrote with a synonym, a stronger term or a weaker one (a written "breach" must not become "perforation"; "migrated" must not become "malposition"). Never add a diagnosis, cause, complication, interpretation or certainty word ("concerning for", "suspicious for", "likely", "in keeping with") the senior did not write. The only wording you add is: expanded abbreviations, spelling and grammar, the standard normal statements for structures the senior did not mention, the technique line and the fallback recommendation. Do not suggest alternative terms anywhere, including the verification sheet.
- Do not print "Rulebook loaded.". Do not create, modify, rename or delete any file (no \`output/\` files). This block replaces the file and chat output of Sections 4, 5 (steps 9 and 10) and 11. Do not use web search or any other external service.
- Return ONE JSON object and nothing else (no prose, no code fences), matching \`scripts/report.schema.json\`:
  - Header fields (patientName, age, gender, tokenNumber, mrNumber, modality, studyDate, referringClinician, clinicalHistory, comparison): copy them exactly as written (H13). Use "" for anything not written in the source; never invent, complete or correct them. The app prints "Not stated in source" for "".
    Two fields are the exception because they are printed in the report header: modality is the study in professional wording with every abbreviation expanded (written "CECT Abd + Pelvis" becomes "Contrast-enhanced CT of the Abdomen and Pelvis"; add no contrast, region, phase or detail the note does not write), and studyDate is ISO YYYY-MM-DD when the note gives a full date (converted, never altered), otherwise exactly as written. Section A of the verification sheet keeps both exactly as written.
  - verbatimTranscription: the Section 6.1 transcription, line by line, with [?] markers and crossed-out text noted.
  - verificationSheet: the Section 11.2 VERIFY content as plain text, starting with its STATUS line. Section A says "Not stated in source" for every absent variable.
  - isUrgent: true if a finding from the Section 9.4 urgent list is written in the senior's own terms, or the senior marked a finding or the advice as urgent (wrote "urgent", "critical", "stat" or "immediate"). urgentFindings: the urgent finding or findings in one or two sentences using the senior's own terms only (H28: no synonym, no added label, no certainty word), otherwise "". Never state that anyone was called or informed: only the resident logs calls.
- If any critical ambiguity remains after the Section 6.4 triage, or the photo is blurred, cropped, unreadable, not a radiology note, or holds more than one case: set status "BLOCKED". Fill the header fields that are readable, verbatimTranscription, and a verificationSheet that starts with "STATUS: BLOCKED" and whose section H holds every CLARIFICATION NEEDED question in the Section 6.4 format. Leave technique "", findings [], impression [] and recommendations [].
- Otherwise set status "READY" and return the full Section 7 report body, after the Section 10 audit passes:
  - technique: the Section 7.2 line.
  - findings: one entry per Section 7.3 region or system, in checklist order (a small single-region study uses one entry titled with its region). Each structure bullet is one item {structure, content, isAbnormal}; write its sub-bullets (written attributes, associated findings, same-organ normal statements) as further sentences of the same content. isAbnormal is true for finding-ledger rows and false for normal-by-convention statements.
  - impression: the Section 9.3 items in order, in the senior's own terms (H28), without numbering.
  - recommendations: the Section 9.4 items in order, without bullets: the urgent-communication line first when it applies, then the senior's advice in the senior's own words, and no recommendation of your own (H28). Never empty: use "Clinical correlation is advised." when the senior wrote no advice.
  - verificationSheet starts with "STATUS: READY".
`;
  return [rulebook, corrections, task].filter(Boolean).join('\n');
}

// Confirmed on agy 1.2.14 (2 Oct 2026): `@path` attaches the note image, `-p` prints non-interactively,
// `--json-schema <file>` returns the checked object in `structured_output`.
function agyArgs(imageRel, model, variant = '') {
  const args = [
    '-p', `Follow the instructions in @${WORK_REL}/prompt.md exactly. The handwritten note image is @${imageRel}. Output only the JSON object.`,
    '--model', agyModelWithEffort(model, variant),
    '--output-format', 'json',
    '--json-schema', 'scripts/report.schema.json',
  ];
  if (variant && !EFFORT_SUFFIX.test(model)) args.push('--effort', variant);
  return args;
}

/** `killTree`/`runCapture`/`runCli` only ever serve the Antigravity CLI now. */
/** Rejects if the promise is still pending after ms — independent of AbortSignal, which a stalled fetch can ignore. */
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill('SIGKILL');
}

function spawnCli(bin, args) {
  // A .cmd/.bat shim needs a shell. These args are fixed strings without quotes or % signs, so plain quoting is safe.
  return /\.(cmd|bat)$/i.test(bin)
    ? spawn([bin, ...args].map((a) => `"${a}"`).join(' '), { cwd: ROOT, shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn(bin, args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
}

function runCli(imageRel, fakeResult, argsFor, engine, model, variant = '') {
  if (fakeResult) return Promise.resolve(fs.readFileSync(fakeResult, 'utf8'));
  const child = spawnCli(AGY_BIN, argsFor(imageRel, model, variant));
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
      if (timedOut) reject(new Error(`${engine} timed out after ${JOB_TIMEOUT_MS / 60_000} min`));
      else if (code !== 0) reject(new Error(`${engine} exited with code ${code}${tail ? `: ${tail}` : ''}`));
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
export function parseResult(output) {
  let value = tryJson(output) ?? tryJson(firstObject(output));
  if (typeof value?.status === 'string' && 'structured_output' in value) {
    if (value.status !== 'SUCCESS') throw new Error(`CLI reported ${value.status}: ${String(value.response ?? value.error ?? '').trim().slice(0, 300)}`);
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
    throw new Error(`CLI output held no JSON object: ${output.trim().slice(0, 300)}`);
  }
  return value;
}

/**
 * Coerces a model's JSON into the app's WorkerResult shape (src/lib/report.ts validateWorkerResult).
 * The agy CLI schema-checked its output; gateway models have no such guard and drift (null instead
 * of "", numbers for ages), so the worker normalizes defensively and lets the app catch the rest.
 */
function sanitizeResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const r = { ...value };
  const str = (v) => (v == null ? '' : typeof v === 'string' ? v : String(v));
  for (const key of ['patientName', 'age', 'gender', 'tokenNumber', 'mrNumber', 'modality', 'studyDate', 'referringClinician', 'clinicalHistory', 'comparison', 'technique', 'urgentFindings', 'verbatimTranscription', 'verificationSheet']) {
    r[key] = str(r[key]);
  }
  r.status = String(r.status ?? '').trim().toUpperCase() === 'BLOCKED' ? 'BLOCKED' : 'READY';
  r.isUrgent = r.isUrgent === true || r.isUrgent === 'true';
  r.findings = (Array.isArray(r.findings) ? r.findings : [])
    .filter((s) => s && typeof s === 'object' && !Array.isArray(s))
    .map((s) => ({
      title: str(s.title),
      items: (Array.isArray(s.items) ? s.items : [])
        .filter((i) => i && typeof i === 'object' && !Array.isArray(i))
        .map((i) => ({ structure: str(i.structure), content: str(i.content), isAbnormal: i.isAbnormal === true || i.isAbnormal === 'true' })),
    }));
  for (const key of ['impression', 'recommendations']) {
    r[key] = (Array.isArray(r[key]) ? r[key] : []).map(str);
  }
  return r;
}

function cleanWorkDir() {
  for (const f of fs.readdirSync(WORK_DIR)) {
    if (f.startsWith('current') || f.startsWith('download')) fs.rmSync(path.join(WORK_DIR, f), { force: true });
  }
}

const MODELS_CACHE_MS = 60_000;
let modelsCache = { at: 0, list: null, variants: {} };
let modelsFetch = null; // the one in-flight models run, shared by the heartbeat and the main loop

const modelsStale = () => !modelsCache.list || Date.now() - modelsCache.at >= MODELS_CACHE_MS;

function runCapture(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawnCli(bin, args);
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', (d) => (stdout += d));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(new Error(`${args.join(' ')} exited ${code}`))));
  });
}

/** Parses `agy models` (effort is encoded in the id suffix) into per-family effort options. */
function parseAgyModels(out, variants) {
  const byFamily = {};
  for (const line of out.split(/\r?\n/)) {
    const id = line.split('\t')[0]?.trim();
    if (!id || !EFFORT_SUFFIX.test(id)) continue;
    const family = id.replace(EFFORT_SUFFIX, '');
    const effort = id.match(EFFORT_SUFFIX)[1];
    (byFamily[family] ??= new Set()).add(effort);
  }
  for (const [family, efforts] of Object.entries(byFamily)) {
    const order = ['low', 'medium', 'high', 'xhigh', 'max'];
    const sorted = [...efforts].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const e of efforts) variants[`${family}-${e}`] = sorted;
  }
}

/** Refreshes the model lists and their reasoning-effort options; concurrent callers share one run. */
function refreshOpencodeModels() {
  modelsFetch ??= (async () => {
    try {
      const variants = {};
      let list = [];
      try {
        const res = await fetch(`${GATEWAY_BASE}/models`, { headers: { Authorization: `Bearer ${gatewayKey()}` }, signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`models HTTP ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        list = rows.map((m) => (typeof m === 'string' ? m : m?.id)).filter((m) => typeof m === 'string');
      } catch {}
      try {
        const agyOut = await runCapture(AGY_BIN, ['models']);
        parseAgyModels(agyOut, variants);
      } catch {}
      modelsCache = { at: Date.now(), list, variants };
    } catch {
      modelsCache = { at: Date.now(), list: [], variants: {} };
    } finally {
      modelsFetch = null;
    }
  })();
  return modelsFetch;
}

async function listOpencodeModels(force = false) {
  if (!force && !modelsStale()) return modelsCache.list;
  await refreshOpencodeModels();
  return modelsCache.list;
}

/** The engine self-test from the Settings dialog: one tiny prompt through the selected engine. */
async function testEngine(engine, model, variant = '') {
  const prompt = 'Reply with the single word OK. Do not write any other text.';
  try {
    const stdout =
      engine === 'opencode'
        ? await gatewayText(model, prompt, null, 120_000)
        : await new Promise((resolve, reject) => {
            const child = spawnCli(AGY_BIN, ['-p', prompt, '--model', agyModelWithEffort(model, variant), '--output-format', 'json']);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            child.stdout.setEncoding('utf8').on('data', (d) => (stdout += d));
            child.stderr.setEncoding('utf8').on('data', (d) => (stderr += d));
            const timer = setTimeout(() => {
              timedOut = true;
              killTree(child);
            }, 120_000);
            child.on('error', (err) => {
              clearTimeout(timer);
              reject(err);
            });
            child.on('close', (code) => {
              clearTimeout(timer);
              if (timedOut) reject(new Error(`${engine} test timed out after 2 min`));
              else if (code !== 0) reject(new Error(`${engine} exited with code ${code}: ${stderr.trim().slice(-300)}`));
              else resolve(stdout);
            });
          });
    return { ok: /\bOK\b/i.test(stdout) || stdout.length > 10, detail: /\bOK\b/i.test(stdout) ? '' : stdout.trim().slice(-200) };
  } catch (err) {
    return { ok: false, detail: String(err?.message || err).slice(0, 300) };
  }
}

async function runJob(report) {
  const tag = report.id.slice(0, 8); // ids only in logs, never patient details
  const started = Date.now();
  const engine = currentEngine; // capture: a Settings change mid-job must not flip the parser
  const model = currentModel;
  const variant = currentVariant;
  job = { id: report.id, child: null };
  log(`${tag}: claimed (${engine}, ${model}${variant ? `, ${variant}` : ''})`);
  try {
    const image = APP_IS_LOCAL ? resolveImage(report.imagePath) : await downloadImage(report.imagePath);
    if (!image) throw new Error('Source image missing');
    const imageRel = `${WORK_REL}/current${path.extname(image).toLowerCase()}`;
    fs.copyFileSync(image, path.join(ROOT, imageRel));
    const prompt = buildPrompt(report);
    fs.writeFileSync(path.join(WORK_DIR, 'prompt.md'), prompt);
    const fake = engine === 'opencode' ? OPENCODE_FAKE_RESULT : AGY_FAKE_RESULT;
    let output;
    if (fake) {
      output = await runCli(imageRel, fake, () => [], engine, model);
    } else if (engine === 'opencode') {
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(image).toLowerCase()];
      if (!mime) throw new Error(`unsupported note photo type: ${path.extname(image)}`);
      const call = gatewayText(model, prompt, { mime, base64: fs.readFileSync(image).toString('base64') }, JOB_TIMEOUT_MS);
      output = await withTimeout(call, JOB_TIMEOUT_MS + 30_000, `opencode gateway stalled past ${JOB_TIMEOUT_MS / 60_000} min`);
    } else {
      output = await runCli(imageRel, null, agyArgs, engine, model, variant);
    }
    const result = sanitizeResult(parseResult(output));
    const saved = await post({ action: 'complete', reportId: report.id, result });
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

async function main() {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  cleanWorkDir();

  // One worker per app (the scratch folder is per APP_URL): a second start exits, so a manual
  // launch and the autostart task never run two AI engines into the same scratch folder.
  const lockPath = path.join(WORK_DIR, 'worker.lock');
  try {
    const other = Number(fs.readFileSync(lockPath, 'utf8').trim());
    if (Number.isInteger(other) && other > 0) {
      let alive = true;
      try {
        process.kill(other, 0);
      } catch (err) {
        alive = err.code === 'EPERM';
      }
      if (alive) {
        log(`another worker for ${APP_URL} is already running (pid ${other}); exiting. If that is wrong, delete ${lockPath}.`);
        return;
      }
      log(`taking over a stale lock left by pid ${other}`);
    }
  } catch {}
  fs.writeFileSync(lockPath, String(process.pid));
  process.on('exit', () => {
    try {
      if (fs.readFileSync(lockPath, 'utf8').trim() === String(process.pid)) fs.rmSync(lockPath, { force: true });
    } catch {}
  });

  // Queued actions handed over by /api/queue's heartbeat reply, execution started in the main loop.
  let testToRun = null;
  let needModelFetch = false;
  const heartbeat = async () => {
    try {
      // The beat must never wait on the models refresh: a slow gateway call is done in
      // the background, and a delayed heartbeat reads as "AI engine offline" in the app.
      if (modelsStale()) refreshOpencodeModels().catch(() => {});
      const body = await post({ action: 'heartbeat', busy: Boolean(job) || Boolean(testToRun), engine: currentEngine, model: currentModel, models: modelsCache.list ?? [], modelVariants: modelsCache.variants ?? {} });
      if (body?.test && !job && !testToRun) testToRun = body.test;
      if (body?.refreshModels) needModelFetch = true;
    } catch {}
  };
  refreshOpencodeModels().catch(() => {}); // warm the model list without delaying the first beat
  heartbeat();
  setInterval(heartbeat, 5000);

  let lastProblem = '';
  for (;;) {
    if (needModelFetch) {
      needModelFetch = false;
      modelsCache.at = 0; // expire so the next heartbeat re-runs the models refresh
      log('refreshing the model list');
      await listOpencodeModels(true).catch(() => {});
    }
    if (testToRun) {
      const t = testToRun;
      testToRun = null;
      log(`testing ${t.engine} with ${t.model}`);
      const result = await testEngine(t.engine, t.model, t.variant || '');
      log(`test ${result.ok ? 'OK' : 'FAILED'}: ${result.detail.split('\n')[0].slice(0, 120)}`);
      await post({ action: 'test_result', engine: t.engine, model: t.model, variant: t.variant || '', ok: result.ok, detail: result.detail }).catch((e) => log(`could not record the test: ${e.message}`));
      continue;
    }

    // Engine/model follow the app Settings unless AI_ENGINE / AI_MODEL force them.
    const settings = await readSettings();
    const { engine, model, variant } = resolveEngineModel(settings);
    if (engine !== currentEngine || model !== currentModel || variant !== currentVariant) {
      currentEngine = engine;
      currentModel = model;
      currentVariant = variant;
      const fake = engine === 'opencode' ? OPENCODE_FAKE_RESULT : AGY_FAKE_RESULT;
      if (!fake && engine === 'antigravity' && !fs.existsSync(AGY_BIN)) {
        log(`Antigravity CLI not found at ${AGY_BIN}; set AGY_BIN or pick another engine`);
      } else if (!fake && engine === 'opencode') {
        try {
          gatewayKey();
        } catch (e) {
          log(e.message);
        }
      }
      log(`engine=${engine} model=${model}${variant ? ` variant=${variant}` : ''} via ${fake || (engine === 'antigravity' ? AGY_BIN : 'the OpenCode gateway')}`);
    }

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
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) await main();
