// Fresh model-list check: what each engine offers right now, and whether the selected one answers.
// Read-only: no queue, no heartbeat, no files, no patient data.
//   node scripts/check-models.mjs                       both engines' lists
//   node scripts/check-models.mjs --engine=antigravity   one engine's list
//   node scripts/check-models.mjs --test                  also run one tiny prompt per engine
//   node scripts/check-models.mjs --test=opencode:deepseek-v4.1-flash   one engine+model
// Exits 1 if a checked engine lists nothing or a test fails.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agyModelCatalog } from './queue_worker.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGY_DIR = path.join(process.env.LOCALAPPDATA || '', 'agy', 'bin');
const AGY_BIN = (process.env.AGY_BIN || ['agy.exe', 'agy.cmd', 'agy'].map((f) => path.join(AGY_DIR, f)).find((p) => fs.existsSync(p)) || path.join(AGY_DIR, 'agy.exe')).trim();
const WORKER = path.join(ROOT, 'scripts', 'queue_worker.mjs');
const args = process.argv.slice(2);
const arg = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');

/** Runs the worker's own CLI modes, so this checks the code the app ships, not a copy of it. */
function worker(args, quiet = false) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [WORKER, ...args], { cwd: ROOT, windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d) => {
      out += d;
      if (!quiet) process.stdout.write(d);
    });
    child.stderr.setEncoding('utf8').on('data', (d) => (err += d));
    child.on('error', (e) => resolve({ code: 1, out, err: String(e.message) }));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

const engines = arg('engine') ? [arg('engine')] : ['antigravity', 'opencode'];
const test = args.includes('--test') ? {} : null;
const explicitTest = arg('test');
let failures = 0;

console.log(`agy: ${AGY_BIN}${fs.existsSync(AGY_BIN) ? '' : '  (NOT FOUND)'}\n`);

for (const engine of engines) {
  const res = await worker([`--list-models`, `--engine=${engine}`], true);
  const lines = res.out.split(/\r?\n/).filter(Boolean);
  const labelled = lines.filter((l) => /\t/.test(l) && !/^\[worker\]/.test(l));
  const bare = lines.filter((l) => !/\t/.test(l) && !/^\[worker\]/.test(l) && /^[a-z0-9][a-z0-9._/-]*$/.test(l));
  const models = labelled.length ? labelled.map((l) => l.split('\t')[0].trim()) : bare;
  console.log(`── ${engine}: ${models.length} models`);
  for (const l of (labelled.length ? labelled : bare).slice(0, 40)) console.log(`   ${l}`);
  if (engine === 'antigravity' && fs.existsSync(AGY_BIN)) {
    // Cross-check the worker's parser against the CLI output read directly.
    const direct = agyModelCatalog(await new Promise((resolve) => {
      const child = spawn(AGY_BIN, ['models'], { cwd: ROOT, windowsHide: true });
      let out = '';
      child.stdout.setEncoding('utf8').on('data', (d) => (out += d));
      child.on('close', () => resolve(out));
      child.on('error', () => resolve(''));
    }));
    const same = direct.models.length === models.length && direct.models.every((m) => models.includes(m));
    console.log(`   cross-check against agy directly: ${same ? 'same list' : `MISMATCH (direct ${direct.models.length}, worker ${models.length})`}`);
    if (!same) failures += 1;
  }
  if (!models.length) {
    console.log(`   ✗ nothing listed — the app's Model dropdown would be empty for ${engine}`);
    failures += 1;
  }
  if (res.code !== 0 || res.err.trim()) console.log(`   note: exit ${res.code}${res.err.trim() ? ` ${res.err.trim().split('\n')[0]}` : ''}`);
  if (test) console.log(`   test: ${engine} …\n`);
  if (test) {
    const model = engine === 'opencode' ? 'deepseek-v4.1-flash' : 'gemini-3.8-flash-low';
    const t = await worker([`--test-engine=${engine}`, `--test-model=${model}`], true);
    console.log(`   ${t.out.split(/\r?\n/).filter(Boolean).join(' | ')}`);
    if (t.code !== 0) failures += 1;
  }
  console.log();
}

if (explicitTest) {
  const [engine, model, variant] = explicitTest.split(':');
  const t = await worker([`--test-engine=${engine}`, `--test-model=${model}`, ...(variant ? [`--test-variant=${variant}`] : [])], true);
  console.log(`── ${explicitTest}\n   ${t.out.split(/\r?\n/).filter(Boolean).join(' | ')}`);
  console.log(`   ${t.code === 0 ? '✓ OK' : '✗ FAILED'}\n`);
  if (t.code !== 0) failures += 1;
}

console.log(failures ? `${failures} check(s) failed` : 'all model checks passed');
process.exit(failures ? 1 : 0);
