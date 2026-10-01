// UI verification: every case state × viewport × theme, served from SYNTHETIC fixtures via request
// interception (no patient data, all writes blocked). Fails on horizontal overflow, clipped or
// wrapped header/toolbar controls, unnamed icon buttons and runtime errors.
//
//   node scripts/verify_ui_screenshot.cjs [baseUrl=http://127.0.0.1:4321] [outDir=.ui-check]
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = (process.argv[2] || 'http://127.0.0.1:4321').replace(/\/$/, '');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', '.ui-check'));
const CHROME = [
  process.env.CHROME_PATH,
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => p && fs.existsSync(p));

/* ---------- synthetic fixtures (clearly fake people) ---------- */

const iso = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const findings = [
  {
    title: 'Hepatobiliary System',
    items: [
      { structure: 'Liver', content: 'Normal in size and attenuation, with no focal lesion.', isAbnormal: false },
      { structure: 'Gallbladder', content: 'Multiple calculi, the largest measuring 12 mm, with no wall thickening.', isAbnormal: true },
    ],
  },
  {
    title: 'Urinary Tract',
    items: [
      { structure: 'Right Kidney', content: 'A 5.4 mm calculus at the mid pole without hydronephrosis.', isAbnormal: true },
      { structure: 'Left Kidney', content: 'Normal in size, position and enhancement.', isAbnormal: false },
    ],
  },
];
const base = {
  tokenNumber: '9001',
  patientName: 'Synthetic Patient A',
  age: '52 Y',
  gender: 'Female',
  mrNumber: 'SYN-0001',
  modality: 'Contrast-enhanced CT of the Abdomen and Pelvis',
  studyDate: '2026-10-01',
  reportingDate: '2026-10-01',
  referringClinician: 'Surgical OPD',
  clinicalHistory: 'Right upper quadrant pain. Synthetic test case.',
  comparison: 'Not stated in source',
  technique: 'Contrast-enhanced CT of the abdomen and pelvis was performed with multiplanar reformations.',
  findingsJson: JSON.stringify(findings),
  findingsMarkdown: '',
  impressionMarkdown: '1. Cholelithiasis without cholecystitis.\n2. Right mid-pole renal calculus measuring 5.4 mm without hydronephrosis.',
  recommendationsMarkdown: 'Clinical correlation is advised.',
  isUrgent: false,
  urgentFindings: null,
  urgentCallLog: null,
  imagePath: '/assets/sample_note.png',
  verbatimTranscription: 'GB - multiple calculi, largest 12 mm\nRt kidney mid pole calculus 5.4 mm, no HN\nRest N',
  verificationSheetMarkdown:
    'STATUS: READY\nA. HEADER VARIABLES: Synthetic Patient A, 52 Y, Female\nB. VERBATIM TRANSCRIPTION: GB multiple calculi, largest 12 mm\nC. FINDING LEDGER: Gallbladder calculi; Right kidney calculus 5.4 mm\nH. AUDIT: PASS',
  auditStatus: 'PASS',
  status: 'DRAFT',
  isArchived: false,
  lastError: null,
  ownerNotes: null,
};
const blank = { ...base, tokenNumber: '', patientName: '', age: '', gender: '', mrNumber: null, modality: '', studyDate: '', referringClinician: null, clinicalHistory: null, comparison: null, technique: '', findingsJson: '[]', impressionMarkdown: '', recommendationsMarkdown: '', verbatimTranscription: null, verificationSheetMarkdown: null, auditStatus: 'PENDING' };

const CASES = {
  draft: { ...base, id: 'syn-draft', createdAt: iso(5), updatedAt: iso(2) },
  urgent: { ...base, id: 'syn-urgent', patientName: 'Synthetic Patient F', isUrgent: true, urgentFindings: 'Free intraperitoneal air in keeping with perforation.', createdAt: iso(4), updatedAt: iso(2) },
  queued: { ...blank, id: 'syn-queued', status: 'QUEUED', createdAt: iso(3), updatedAt: iso(3) },
  processing: { ...blank, id: 'syn-processing', status: 'PROCESSING', createdAt: iso(2), updatedAt: iso(1) },
  blocked: {
    ...base,
    id: 'syn-blocked',
    patientName: 'Synthetic Patient B',
    status: 'BLOCKED',
    auditStatus: 'BLOCKED',
    findingsJson: '[]',
    impressionMarkdown: '',
    verificationSheetMarkdown: 'STATUS: BLOCKED\nA. HEADER VARIABLES: Synthetic Patient B\nH. AUDIT: CLARIFICATION NEEDED\n1. Item: side of the renal lesion (line 3) — Possible readings: Rt / Lt\n2. Item: lesion size (line 4) — Possible readings: 1.5 cm / 15 cm',
    createdAt: iso(6),
    updatedAt: iso(2),
  },
  failed: { ...blank, id: 'syn-failed', patientName: 'Synthetic Patient C', status: 'FAILED', lastError: 'agy exited with code 1: quota exceeded for gemini-3.8-flash-high', createdAt: iso(7), updatedAt: iso(3) },
  finalized: { ...base, id: 'syn-final', patientName: 'Synthetic Patient D', status: 'FINALIZED', createdAt: iso(8), updatedAt: iso(1) },
  archived: { ...base, id: 'syn-arch', patientName: 'Synthetic Patient E', isArchived: true, createdAt: iso(9), updatedAt: iso(9) },
};
const listWith = (first) => [CASES[first], ...Object.entries(CASES).filter(([k]) => k !== first).map(([, v]) => v)];

/* ---------- scenarios ---------- */

const DESKTOP = [
  { w: 1280, h: 800 },
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
];
const scenarios = [
  ...DESKTOP.flatMap((v) => ['light', 'dark'].map((scheme) => ({ name: `draft-${v.w}-${scheme}`, ...v, scheme, list: listWith('draft'), online: true }))),
  { name: 'empty-1366-light', w: 1366, h: 768, scheme: 'light', list: [], online: false },
  { name: 'urgent-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('urgent'), online: true },
  { name: 'queued-offline-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('queued'), online: false },
  { name: 'processing-1366-dark', w: 1366, h: 768, scheme: 'dark', list: listWith('processing'), online: true, busy: true, motion: true },
  { name: 'processing-reduced-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('processing'), online: true, busy: true },
  { name: 'blocked-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('blocked'), online: true },
  { name: 'failed-1366-dark', w: 1366, h: 768, scheme: 'dark', list: listWith('failed'), online: true },
  { name: 'finalized-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('finalized'), online: true },
  { name: 'end-of-sheet-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('draft'), online: true, step: 'end' },
  { name: 'audit-1366-light', w: 1366, h: 768, scheme: 'light', list: listWith('draft'), online: true, step: 'audit' },
  { name: 'approve-1366-dark', w: 1366, h: 768, scheme: 'dark', list: listWith('draft'), online: true, step: 'approve' },
  { name: 'tablet-768-light', w: 768, h: 1024, scheme: 'light', list: listWith('draft'), online: true, touch: true },
  { name: 'phone-390-light', w: 390, h: 844, scheme: 'light', list: listWith('draft'), online: true, touch: true },
  { name: 'phone-390-dark-note', w: 390, h: 844, scheme: 'dark', list: listWith('draft'), online: true, touch: true, step: 'note' },
  { name: 'phone-390-drawer', w: 390, h: 844, scheme: 'light', list: listWith('draft'), online: true, touch: true, step: 'drawer' },
  { name: 'phone-390-empty', w: 390, h: 844, scheme: 'light', list: [], online: false, touch: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  if (!CHROME) throw new Error('No Chrome/Chromium found (set CHROME_PATH)');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'] });
  const failures = [];

  for (const s of scenarios) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, hasTouch: !!s.touch, isMobile: !!s.touch && s.w < 900 });
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: s.scheme },
      { name: 'prefers-reduced-motion', value: s.motion ? 'no-preference' : 'reduce' },
    ]);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && !/favicon/i.test(m.text()) && errors.push(m.text()));

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = new URL(req.url());
      const json = (status, body) => req.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/reports' && req.method() === 'GET') return json(200, s.list);
      if (url.pathname === '/api/queue' && req.method() === 'GET') return json(200, { workerLastSeen: s.online ? Date.now() : null, workerBusy: !!s.busy });
      if (url.pathname.startsWith('/api/') || req.method() !== 'GET') return json(409, { error: 'UI verification run: writes are disabled' });
      if (url.pathname.startsWith('/uploads/')) return req.respond({ status: 404, body: '' }); // never load real note photos
      return req.continue();
    });

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await sleep(500);

    const clickText = (re) => page.evaluate((src) => [...document.querySelectorAll('button')].find((b) => new RegExp(src).test(b.textContent) && !b.disabled)?.click(), re.source);
    if (s.step === 'audit') await page.click('button[aria-label="Audit sheet"]');
    if (s.step === 'approve') await clickText(/Approve & download/);
    if (s.step === 'note') await clickText(/^Note$/);
    if (s.step === 'drawer') await page.click('button[aria-label="Open case list"]');
    if (s.step === 'end') await page.evaluate(() => document.querySelector('#impression')?.closest('.overflow-y-auto')?.scrollTo(0, 1e6));
    if (s.step) await sleep(600);

    const m = await page.evaluate(() => {
      const visible = (el) => !!el.offsetParent && el.getBoundingClientRect().width > 0;
      const controls = [...document.querySelectorAll('header button, header a, [role="group"] button, nav button')].filter(visible);
      const clipped = controls.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().height > 46).map((el) => el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30));
      const unnamed = [...document.querySelectorAll('button, a[href]')].filter((el) => visible(el) && !el.textContent.trim() && !el.getAttribute('aria-label')).map((el) => el.outerHTML.slice(0, 80));
      return { overflowX: document.documentElement.scrollWidth - window.innerWidth, clipped, unnamed };
    });

    await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
    const problems = [
      m.overflowX > 0 && `horizontal overflow ${m.overflowX}px`,
      m.clipped.length && `clipped controls: ${m.clipped.join(', ')}`,
      m.unnamed.length && `unnamed controls: ${m.unnamed.join(' | ')}`,
      errors.length && `errors: ${errors.join(' | ').slice(0, 300)}`,
    ].filter(Boolean);
    console.log(`${problems.length ? '✗' : '✓'} ${s.name}${problems.length ? ' — ' + problems.join('; ') : ''}`);
    if (problems.length) failures.push(s.name);
    await page.close();
  }

  await browser.close();
  console.log(`\n${scenarios.length - failures.length}/${scenarios.length} scenarios clean · screenshots in ${OUT}`);
  if (failures.length) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
