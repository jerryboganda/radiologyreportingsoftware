// Tests for the wording check (src/lib/wording.ts). Synthetic notes only, no patient data.
//   node scripts/wording-check.test.mjs      (Node 22.18+ runs the TypeScript source directly)
import assert from 'node:assert/strict';
import { checkWording, wordingSignature } from '../src/lib/wording.ts';

const NOTE = `Pt: Test A, 60 Y / Male
Study: CECT Abd + Pelvis
- CBD stent in situ -> prox end migrated in liver parench
- distal end in D2 c local mural air / breach (urgent)
- prox CBD 8.4 mm, distal 6.0 mm
- rest abd organs NAD, no FF, no gross pneumoperitoneum
Impression: 1. CBD stent proximal hepatic migration with distal D2 duodenal mural breach.
Adv: URGENT surgical / gastro review & stent retrieval!`;

const base = {
  findingsJson: '[]',
  impressionMarkdown: '',
  recommendationsMarkdown: '',
  isUrgent: true,
  urgentFindings: '',
  verbatimTranscription: NOTE,
  ownerNotes: null,
  auditStatus: 'PASS',
};
const item = (structure, content) => JSON.stringify([{ title: 'Abdomen', items: [{ structure, content, isAbnormal: true }] }]);
const terms = (flags) => flags.map((f) => f.term).sort();
let n = 0;
const test = (name, fn) => {
  fn();
  console.log(`✓ ${++n}. ${name}`);
};

test('the real failure is caught: "malposition", "concerning for", "perforation" were never written', () => {
  const flags = checkWording({
    ...base,
    urgentFindings: 'Common bile duct stent malposition with proximal hepatic migration and distal end in D2 with local mural air and breach, concerning for duodenal perforation.',
  });
  assert.deepEqual(terms(flags), ['concerning for', 'malposition', 'perforation']);
  assert.ok(flags.every((f) => f.key === 'urgent' && f.where === 'Red box'));
});

test('the senior\'s own words are clean, including normal statements with negated or "thickness" wording', () => {
  const flags = checkWording({
    ...base,
    urgentFindings: 'Common bile duct stent in situ with proximal end migrated in the liver parenchyma and distal end in the second part of the duodenum with local mural air / breach.',
    findingsJson: item(
      'Stomach and bowel',
      'The distal end of the stent is in D2 with local mural air / breach. The remainder demonstrates normal calibre and wall thickness, with no wall thickening, dilatation or obstruction.',
    ),
    impressionMarkdown: '1. Common bile duct stent proximal hepatic migration with distal D2 duodenal mural breach.\n2. No other significant abnormality in the abdomen or pelvis.',
    recommendationsMarkdown: 'Urgent communication of these findings to the referring team is advised.\nUrgent surgical and gastroenterology review for stent retrieval is advised.',
  });
  assert.deepEqual(flags, []);
});

test('an invented number is caught; every number the senior wrote passes', () => {
  assert.deepEqual(terms(checkWording({ ...base, impressionMarkdown: '1. Prominent proximal common bile duct (9.4 mm).' })), ['9.4']);
  assert.deepEqual(checkWording({ ...base, impressionMarkdown: '1. Prominent proximal common bile duct (8.4 mm), distal 6.0 mm.' }), []);
});

test('an invented finding or diagnosis is caught in the findings list, with its row key', () => {
  const flags = checkWording({ ...base, findingsJson: item('Pancreas', 'A hypodense mass with peripancreatic collection is seen.') });
  assert.deepEqual(terms(flags), ['collection', 'hypodense', 'mass']);
  assert.equal(flags[0].key, 'findings:0:0');
  assert.equal(flags[0].where, 'Findings · Pancreas');
});

test('negation: standard normal statements in the findings list are ignored; an affirmative one after "but" is not', () => {
  const normal = (content) => checkWording({ ...base, findingsJson: item('Chest', content) });
  assert.deepEqual(normal('No pneumothorax or effusion.'), []);
  assert.deepEqual(normal('Obstruction is not seen.'), []);
  assert.deepEqual(terms(normal('There is no free fluid, but perforation is present.')), ['perforation']);
});

test('outside the findings list a negated serious term is still an unwritten claim ("No evidence of metastasis")', () => {
  assert.deepEqual(terms(checkWording({ ...base, impressionMarkdown: '1. No evidence of distant metastasis.' })), ['metastasis']);
  assert.deepEqual(terms(checkWording({ ...base, urgentFindings: 'No pneumothorax.' })), ['pneumothorax']);
  // ...but not when the senior wrote it ("no gross pneumoperitoneum" is in the note)
  assert.deepEqual(checkWording({ ...base, impressionMarkdown: '1. No gross pneumoperitoneum.' }), []);
});

test('added qualifiers and counts are caught (solitary, primary, indeterminate), the senior\'s own are not', () => {
  const note = { ...base, verbatimTranscription: 'Biopsy proven (L) breast CA. (R) lung hypodense nodule m/s 6.5 mm in RML. Few rounded LN, largest 6.5 mm. B/L apical fibrotic changes.' };
  assert.deepEqual(
    terms(checkWording({ ...note, impressionMarkdown: '1. Solitary 6.5 mm hypodense nodule.\n2. Primary breast carcinoma.\n3. Indeterminate right middle lobe nodule.' })),
    ['indeterminate', 'primary', 'solitary'],
  );
  assert.deepEqual(checkWording({ ...note, impressionMarkdown: '1. Biopsy-proven left breast carcinoma.\n2. A hypodense nodule of 6.5 mm in the right middle lobe.\n3. A few rounded lymph nodes, the largest 6.5 mm.' }), []);
});

test('advice the AI made up is caught (MRI, follow-up, tumour board, "as clinically indicated"); the senior\'s own advice is not', () => {
  const flagged = checkWording({
    ...base,
    recommendationsMarkdown: 'Multidisciplinary tumour board discussion regarding staging and management is advised.\nShort-interval follow-up MRI as clinically indicated.',
  });
  assert.deepEqual(terms(flagged), ['follow-up', 'indicated', 'management', 'mri', 'multidisciplinary', 'staging', 'tumour']);
  assert.deepEqual(checkWording({ ...base, recommendationsMarkdown: 'Urgent communication of these findings to the referring team is advised.\nUrgent surgical and gastroenterology review for stent retrieval is advised.' }), []);
});

test('regression: the first real overreach ("suspicious for metastasis", "tumour board", "as clinically indicated") is caught, the written CA is not', () => {
  const note = { ...base, verbatimTranscription: 'Biopsy Proven (L) breast CA. (R) lung shows a welldefined hypodense S.T.D nodule m/s 6.5mm in (R) middle lobe causing infiltration of pleura.' };
  const flags = checkWording({
    ...note,
    impressionMarkdown: '1. Biopsy-proven left breast carcinoma.\n2. A 6.5 mm hypodense soft tissue density nodule with adjacent pleural infiltration, suspicious for pulmonary metastasis.',
    recommendationsMarkdown: 'Multidisciplinary breast cancer tumour board discussion is advised.\nFurther evaluation of the right middle lobe nodule as clinically indicated.',
  });
  assert.deepEqual(terms(flags), ['indicated', 'metastasis', 'multidisciplinary', 'suspicious', 'tumour']);
});

test('different words are different claims: "scattered" in the note does not excuse "solitary", MRI does not excuse ultrasound', () => {
  const note = { ...base, verbatimTranscription: 'Liver: scattered hypodense foci. Adv: MRI liver.' };
  assert.deepEqual(terms(checkWording({ ...note, impressionMarkdown: 'Solitary hyperdense focus. Ultrasound is advised.' })), ['hyperdense', 'solitary', 'ultrasound']);
  assert.deepEqual(checkWording({ ...note, impressionMarkdown: 'Scattered hypodense foci. MRI of the liver is advised.' }), []);
});

test('abbreviations the senior wrote allow their expansions (HDN, #, SOL, mets)', () => {
  const note = { ...base, verbatimTranscription: 'Rt HDN, L2 # , SOL liver, mets ++ in the lungs and bones' };
  assert.deepEqual(checkWording({ ...note, impressionMarkdown: 'Right hydronephrosis. L2 fracture. Liver mass. Metastases in the lungs.' }), []);
  assert.ok(terms(checkWording({ ...base, impressionMarkdown: 'Right hydronephrosis.' })).includes('hydronephrosis'));
});

test('certainty words: allowed only when the senior wrote the marker (?, s/o, c/w), never otherwise', () => {
  const withQuery = { ...base, verbatimTranscription: 'Liver SOL ? abscess, s/o hepatic abscess, c/w infection' };
  assert.deepEqual(checkWording({ ...withQuery, impressionMarkdown: 'Possible hepatic abscess, suggestive of infection, consistent with infection.' }), []);
  assert.deepEqual(terms(checkWording({ ...base, impressionMarkdown: 'Likely suspicious for malignancy.' })), ['likely', 'malignancy', 'suspicious']);
});

test('the [?] marker of an unsure transcription does not switch hedges on', () => {
  const unsure = { ...base, verbatimTranscription: 'CBD stent [?] migrated prox end, distal end in D2 [?] mural breach' };
  assert.deepEqual(terms(checkWording({ ...unsure, impressionMarkdown: 'Possible stent migration.' })), ['possible']);
});

test('the owner\'s corrections count as written', () => {
  const r = { ...base, ownerNotes: 'The lesion is an abscess, not a mass.', impressionMarkdown: 'Hepatic abscess.' };
  assert.deepEqual(checkWording(r), []);
});

test('synonyms of the same stem are the senior\'s word (migrated / migration, obstructed / obstruction)', () => {
  assert.deepEqual(checkWording({ ...base, verbatimTranscription: NOTE + '\nobstruction of the duct', impressionMarkdown: 'The duct is obstructed. Stent migration.' }), []);
});

test('nothing to compare against means no flags: legacy rows and manual reports', () => {
  const r = { ...base, impressionMarkdown: 'Perforation with abscess.' };
  assert.deepEqual(checkWording({ ...r, auditStatus: 'LEGACY' }), []);
  assert.deepEqual(checkWording({ ...r, verbatimTranscription: null }), []);
  assert.deepEqual(checkWording({ ...r, verbatimTranscription: '' }), []);
});

test('the signature follows the flagged terms and sections, not their order or position', () => {
  const a = checkWording({ ...base, impressionMarkdown: '1. Perforation.\n2. Abscess.' });
  const b = checkWording({ ...base, impressionMarkdown: '1. Abscess.\n2. Perforation.' });
  assert.equal(wordingSignature(a), wordingSignature(b));
  assert.notEqual(wordingSignature(a), wordingSignature(checkWording({ ...base, impressionMarkdown: '1. Abscess.' })));
  assert.equal(wordingSignature([]), '');
});

test('the red box is checked only on an urgent case: it does not print otherwise', () => {
  const urgentFindings = 'Duodenal perforation.';
  assert.deepEqual(terms(checkWording({ ...base, urgentFindings })), ['perforation']);
  assert.deepEqual(checkWording({ ...base, isUrgent: false, urgentFindings }), []);
  assert.deepEqual(checkWording({ ...base, isUrgent: null, urgentFindings }), []);
});

test('an unreadable findings list does not crash the check', () => {
  assert.deepEqual(checkWording({ ...base, findingsJson: 'not json', impressionMarkdown: '1. Stent migration.' }), []);
});

console.log(`\nall ${n} wording-check tests passed`);
