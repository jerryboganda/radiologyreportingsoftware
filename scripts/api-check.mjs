// API contract check, Node built-ins only. It writes cases, so run it ONLY against an isolated server with an
// empty DATA_DIR and UPLOADS_DIR, never against real data:
//   node scripts/api-check.mjs http://127.0.0.1:4399
import assert from 'node:assert/strict';

const BASE = (process.argv[2] || 'http://127.0.0.1:4399').replace(/\/+$/, '');
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const d = new Date();
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Synthetic worker results (no patient data).
const READY = {
  status: 'READY',
  patientName: 'Fixture Patient',
  age: '40 Y',
  gender: 'Female',
  tokenNumber: '0001',
  mrNumber: '',
  modality: 'CT Brain',
  studyDate: '2026-10-01',
  referringClinician: '',
  clinicalHistory: '',
  comparison: '',
  technique: 'CT of the brain was performed.',
  findings: [{ title: 'Brain', items: [{ structure: 'Parenchyma', content: 'Normal grey-white differentiation.', isAbnormal: false }] }],
  impression: ['Normal CT brain.'],
  recommendations: ['Clinical correlation is advised.'],
  isUrgent: false,
  urgentFindings: '',
  verbatimTranscription: 'fixture note',
  verificationSheet: 'STATUS: READY\nH. AUDIT  PASS',
};
const BLOCKED = {
  ...READY,
  status: 'BLOCKED',
  technique: '',
  findings: [],
  impression: [],
  recommendations: [],
  verificationSheet: 'STATUS: BLOCKED\nH. AUDIT\nCLARIFICATION NEEDED: fixture\n1. Item: side',
};

async function call(method, path, body) {
  const init = { method };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  const res = await fetch(BASE + path, init);
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, type, data };
}
const queue = (body) => call('POST', '/api/queue', body);
const edit = (body) => call('POST', '/api/reports', body);
const rowOf = async (id) => (await call('GET', '/api/reports')).data.find((r) => r.id === id);

function ingest(name = 'fixture.png', type = 'image/png') {
  const form = new FormData();
  form.append('image', new Blob([PNG_1X1], { type }), name);
  return call('POST', '/api/ingest', form);
}

function expectRow(res, fields) {
  assert.equal(res.status, 200, JSON.stringify(res.data));
  for (const [key, value] of Object.entries(fields)) assert.deepEqual(res.data[key], value, key);
}

let current = '';
async function step(name, fn) {
  current = name;
  await fn();
  console.log(`✓ ${name}`);
}

try {
  let id = '';
  let second = '';
  let imagePath = '';

  await step('POST /api/ingest creates a blank QUEUED case and serves its image', async () => {
    const res = await ingest();
    expectRow(res, { status: 'QUEUED', auditStatus: 'PENDING', tokenNumber: '', findingsJson: '[]', reportingDate: TODAY, isArchived: false });
    for (const key of ['patientName', 'age', 'gender', 'modality', 'studyDate', 'technique', 'findingsMarkdown', 'impressionMarkdown', 'recommendationsMarkdown']) {
      assert.equal(res.data[key], '', key);
    }
    for (const key of ['mrNumber', 'referringClinician', 'clinicalHistory', 'comparison', 'urgentFindings', 'urgentCallLog', 'verbatimTranscription', 'verificationSheetMarkdown', 'lastError', 'ownerNotes']) {
      assert.equal(res.data[key], null, key);
    }
    assert.match(res.data.imagePath, /^\/uploads\/fixture_\d+\.png$/);
    ({ id, imagePath } = res.data);
    const image = await call('GET', imagePath);
    assert.equal(image.status, 200);
    assert.equal(image.type, 'image/png');
  });

  await step('ingest rejects non-image uploads with 415', async () => {
    assert.equal((await ingest('note.svg', 'image/svg+xml')).status, 415);
    assert.equal((await ingest('note.txt', 'text/plain')).status, 415);
  });

  await step('edit while QUEUED -> 409', async () => {
    assert.equal((await edit({ id, patientName: 'X' })).status, 409);
  });

  await step('claim -> PROCESSING, heartbeat recorded', async () => {
    const res = await queue({ action: 'claim' });
    assert.equal(res.data.report?.id, id);
    assert.equal(res.data.report.status, 'PROCESSING');
    const status = (await call('GET', '/api/queue')).data;
    assert.equal(typeof status.workerLastSeen, 'number');
    assert.equal(status.workerBusy, true);
  });

  await step('complete (READY) -> DRAFT, audit PASS, findingsMarkdown derived', async () => {
    expectRow(await queue({ action: 'complete', reportId: id, result: READY }), {
      status: 'DRAFT',
      auditStatus: 'PASS',
      lastError: null,
      patientName: 'Fixture Patient',
      findingsMarkdown: '### Brain\n- **Parenchyma:** Normal grey-white differentiation.',
      impressionMarkdown: '1. Normal CT brain.',
    });
  });

  await step('edit ignores status/archive/audit fields and re-derives findingsMarkdown', async () => {
    const findingsJson = JSON.stringify([{ title: 'Head', items: [{ structure: 'Ventricles', content: 'Normal.' }] }]);
    expectRow(await edit({ id, status: 'FINALIZED', isArchived: true, auditStatus: 'LEGACY', patientName: 'Edited Name', findingsJson }), {
      patientName: 'Edited Name',
      status: 'DRAFT',
      isArchived: false,
      auditStatus: 'PASS',
      findingsMarkdown: '### Head\n- **Ventricles:** Normal.',
    });
  });

  await step('edit rejects malformed findingsJson, bad types and an imagePath outside uploads (400)', async () => {
    assert.equal((await edit({ id, findingsJson: '{"title":1}' })).status, 400);
    assert.equal((await edit({ id, patientName: null })).status, 400);
    assert.equal((await edit({ id, imagePath: '/uploads/../data/radiology.db' })).status, 400);
    assert.equal((await edit({ patientName: 'no id' })).status, 400);
    assert.equal((await edit({ id: 'no-such-id', patientName: 'X' })).status, 404);
  });

  await step('enqueue a draft with content without force -> 409 needsConfirm', async () => {
    const res = await queue({ action: 'enqueue', reportId: id });
    assert.equal(res.status, 409);
    assert.equal(res.data.needsConfirm, true);
  });

  await step('GET /api/pdf/<id> -> PDF, case FINALIZED and dated today', async () => {
    const res = await call('GET', `/api/pdf/${id}`);
    assert.equal(res.status, 200, String(res.data));
    assert.equal(res.type, 'application/pdf');
    assert.equal(res.data.subarray(0, 4).toString(), '%PDF');
    const row = await rowOf(id);
    assert.equal(row.status, 'FINALIZED');
    assert.equal(row.reportingDate, TODAY);
  });

  await step('edit while FINALIZED -> 409', async () => {
    assert.equal((await edit({ id, patientName: 'Y' })).status, 409);
  });

  await step('reopen -> DRAFT (again -> 409)', async () => {
    expectRow(await edit({ id, action: 'reopen' }), { status: 'DRAFT' });
    assert.equal((await edit({ id, action: 'reopen' })).status, 409);
  });

  await step('archive and restore flip only isArchived', async () => {
    expectRow(await edit({ id, action: 'archive' }), { isArchived: true, status: 'DRAFT' });
    expectRow(await edit({ id, action: 'restore' }), { isArchived: false, status: 'DRAFT' });
  });

  await step('second case: concurrent claims hand it out once, fail -> FAILED + lastError', async () => {
    second = (await ingest('second.png')).data.id;
    const claims = await Promise.all([queue({ action: 'claim' }), queue({ action: 'claim' })]);
    const won = claims.map((c) => c.data.report).filter(Boolean);
    assert.equal(won.length, 1);
    assert.equal(won[0].id, second);
    expectRow(await queue({ action: 'fail', reportId: second, error: 'fixture failure' }), { status: 'FAILED', lastError: 'fixture failure' });
  });

  await step('retry_failed re-queues it', async () => {
    const res = await queue({ action: 'retry_failed' });
    assert.ok(res.data.count >= 1, JSON.stringify(res.data));
    assert.equal((await rowOf(second)).status, 'QUEUED');
  });

  await step('dequeue -> DRAFT, enqueue of a blank draft needs no force', async () => {
    expectRow(await edit({ id: second, action: 'dequeue' }), { status: 'DRAFT' });
    expectRow(await queue({ action: 'enqueue', reportId: second }), { status: 'QUEUED', auditStatus: 'PENDING' });
  });

  await step('/api/image is gone; missing uploads and subpaths -> 404', async () => {
    assert.equal((await call('GET', '/api/image?file=x')).status, 404);
    assert.equal((await call('GET', '/uploads/does-not-exist.png')).status, 404);
    // `sub\..\<real file>` would resolve to the real upload on a Windows host without the no-subpath rule.
    assert.equal((await call('GET', imagePath.replace('/uploads/', '/uploads/sub%5C..%5C'))).status, 404);
  });

  await step('BLOCKED path: invalid result -> 422, BLOCKED result -> BLOCKED', async () => {
    assert.equal((await queue({ action: 'claim' })).data.report?.id, second);
    const invalid = await queue({ action: 'complete', reportId: second, result: { ...READY, findings: [] } });
    assert.equal(invalid.status, 422);
    assert.ok(invalid.data.errors.length > 0);
    expectRow(await queue({ action: 'complete', reportId: second, result: BLOCKED }), { status: 'BLOCKED', auditStatus: 'BLOCKED', findingsJson: '[]' });
    assert.equal((await queue({ action: 'complete', reportId: second, result: READY })).status, 409);
  });

  await step('DELETE archives (flag only); nothing left to claim', async () => {
    assert.equal((await call('DELETE', `/api/reports?id=${second}`)).status, 200);
    const row = await rowOf(second);
    assert.equal(row.isArchived, true);
    assert.equal(row.status, 'BLOCKED');
    assert.equal((await queue({ action: 'claim' })).data.report, null);
  });
} catch (err) {
  console.error(`✗ ${current}\n  ${err.message}`);
  process.exit(1);
}
