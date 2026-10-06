// Wording check (owner ruling H28, AGENTS.md): finds serious medical terms, certainty words and numbers in a report
// that the senior's note does not contain. Pure TypeScript with no runtime imports, so one implementation gates the PDF
// on the server and warns live in the browser, and they can never disagree.
//
// It checks a fixed list of terms plus every number, against the AI's transcription of the note and the owner's
// corrections. It is a safety net for the resident's own check, not a replacement for it.
import type { ReportItem } from './report';

export type WordingKind = 'diagnosis' | 'finding' | 'hedge' | 'cause' | 'severity' | 'advice' | 'number';
export type WordingSection = 'urgent' | 'findings' | 'impression' | 'recommendations';

export interface WordingFlag {
  /** The place the term sits in: "urgent", "findings:<region>:<row>", "impression:<line>", "recommendations:<line>". */
  key: string;
  /** The word as the report says it, lower-case. */
  term: string;
  kind: WordingKind;
  section: WordingSection;
  /** Human label of the place, e.g. "Red box" or "Impression point 1". */
  where: string;
  /** A short quote with the flagged term in the middle. */
  before: string;
  match: string;
  after: string;
}

type Source = Pick<ReportItem, 'findingsJson' | 'impressionMarkdown' | 'recommendationsMarkdown' | 'isUrgent' | 'urgentFindings' | 'verbatimTranscription' | 'ownerNotes' | 'auditStatus'> & { sourceText?: string | null };

interface Entry {
  /** Global regex over the report text. */
  re: RegExp;
  /** The same pattern, non-global, to look for the term in the senior's note. */
  probe: RegExp;
  kind: WordingKind;
  /** A negated mention ("no obstruction") is a normal statement and is ignored. Hedges and causes are never negated. */
  negatable: boolean;
  /** Extra evidence that the senior wrote this concept, e.g. an abbreviation (AGENTS.md 6.2). */
  written?: RegExp;
}

const entry = (kind: WordingKind, negatable: boolean, source: string, written?: RegExp): Entry => ({
  re: new RegExp(`\\b(?:${source})\\w*`, 'gi'),
  probe: new RegExp(`\\b(?:${source})`, 'i'),
  kind,
  negatable,
  written,
});

const diagnosis = (source: string, written?: RegExp) => entry('diagnosis', true, source, written);
const finding = (source: string, written?: RegExp) => entry('finding', true, source, written);
const hedge = (source: string, written?: RegExp) => entry('hedge', false, source, written);
const cause = (source: string, written?: RegExp) => entry('cause', false, source, written);
const severity = (source: string, written?: RegExp) => entry('severity', true, source, written);
const advice = (source: string, written?: RegExp) => entry('advice', false, source, written);

/** One entry per word in "a|b|c": different words are different claims, so one written word never excuses another. */
const many = (make: (source: string, written?: RegExp) => Entry, list: string, written?: RegExp): Entry[] => list.split('|').map((word) => make(word, written));

const QUERY = /\?|\bposs\b|\bquery\b|\bqry\b|\br\/o\b|\bd\/d\b|\bddx\b/;

const LEXICON: Entry[] = [
  // Diagnoses and complications: the senior's label, never ours.
  diagnosis('perforat', /\bperf\b/),
  diagnosis('ruptur'),
  diagnosis('abscess'),
  diagnosis('malignan'),
  diagnosis('carcinoma|adenocarcinoma', /\bca\b/),
  diagnosis('cancer', /\bca\b/),
  diagnosis('neoplas'),
  diagnosis('tumou?r'),
  diagnosis('lymphoma'),
  diagnosis('sarcoma'),
  diagnosis('melanoma'),
  diagnosis('metasta', /\bmets?\b/),
  diagnosis('infarct'),
  diagnosis('isch(?:a)?emi'),
  diagnosis('h(?:a)?emorrhag', /\b(?:edh|sdh|sah|ich|ivh)\b/),
  diagnosis('h(?:a)?ematoma', /\b(?:edh|sdh)\b/),
  diagnosis('bleed'),
  diagnosis('thromb', /\bdvt\b/),
  diagnosis('embol', /\b(?:pe|dvt|ctpa)\b/),
  diagnosis('aneurysm'),
  diagnosis('dissect'),
  diagnosis('occlu'),
  diagnosis('obstruct', /\bobst\b/),
  diagnosis('stenos'),
  diagnosis('strictur'),
  diagnosis('ileus'),
  diagnosis('volvulus'),
  diagnosis('intussuscept'),
  diagnosis('torsion'),
  diagnosis('strangulat'),
  diagnosis('hernia'),
  diagnosis('appendicitis'),
  diagnosis('cholecystitis'),
  diagnosis('cholangitis'),
  diagnosis('pancreatitis'),
  diagnosis('diverticulitis'),
  diagnosis('colitis'),
  diagnosis('enteritis'),
  diagnosis('gastritis'),
  diagnosis('hepatitis'),
  diagnosis('pyelonephritis'),
  diagnosis('nephritis'),
  diagnosis('cystitis'),
  diagnosis('pneumonia'),
  diagnosis('pneumonitis'),
  diagnosis('peritonitis'),
  diagnosis('empyema'),
  diagnosis('sepsis|septic'),
  diagnosis('cellulitis'),
  diagnosis('osteomyelitis'),
  diagnosis('cirrhosis', /\bcld\b/),
  diagnosis('steatos'),
  diagnosis('fatty'),
  diagnosis('hydronephro|hydroureteronephro', /\b(?:hdn|hun)\b/),
  diagnosis('hydrocephalus'),
  diagnosis('pneumothora', /\bptx\b/),
  diagnosis('pneumoperitoneum'),
  diagnosis('pneumomediastinum'),
  diagnosis('effusion', /\bpe\b/),
  diagnosis('ascites'),
  diagnosis('necro'),
  diagnosis('gangren'),
  diagnosis('fistula'),
  diagnosis('fractur', /#(?!\d)/),
  diagnosis('dislocat'),
  diagnosis('inflammat'),
  diagnosis('infect'),
  diagnosis('malposition'),
  diagnosis('misplace'),
  diagnosis('penetrat'),
  diagnosis('extraluminal'),
  diagnosis('extravasat'),
  diagnosis('leak'),
  diagnosis('erosi|eroded'),
  diagnosis('dysfunction'),
  diagnosis('failure'),
  diagnosis('o?edema'),
  diagnosis('consolidat'),
  diagnosis('atelectas'),
  diagnosis('emphysema'),
  diagnosis('fibrosis'),
  diagnosis('bronchiectasis'),

  // Findings and descriptors: invented ones are as dangerous as invented diagnoses.
  finding('mass(?:es)?\\b', /\bsol\b/),
  finding('nodul', /\bnodes?\b/),
  finding('lesion', /\bsol\b/),
  finding('cyst'),
  finding('calcif'),
  finding('calcul'),
  ...many(finding, 'stone|lithiasis'),
  finding('polyp'),
  finding('collection'),
  finding('lymphadenopath', /\b(?:lap|ln|lns|nodes?)\b/),
  finding('thicken'), // "thickness" belongs to the standard normal statements ("normal wall thickness") and must not match
  finding('dilat', /\b(?:ihbd|hdn|hun)\b/),
  finding('enlarg', /↑|\bhsm\b|megaly|increas/),
  finding('atroph'),
  finding('stent'),
  finding('drain'),
  finding('catheter'),
  finding('migrat'),
  ...many(finding, 'solitary|single|multiple|numerous|several|scattered|diffuse'), // counts and extent (H6)
  ...many(finding, 'primary|indeterminate|equivocal|worrisome|benign|aggressive|atypical|complex'), // labels the senior did not give
  finding('infiltrat'),
  finding('invasi'),
  ...many(finding, 'spiculat|lobulat|irregular'), // margins, only if written (H9)
  ...many(finding, 'well-?defined|ill-?defined'),
  ...many(finding, 'hypodens|hyperdens|isodens|hypoechoic|hyperechoic|anechoic|isoechoic'), // density and echo, only if written (H9)

  // Certainty words the senior did not write (H8). Never negation-scoped.
  hedge('concern(?:ing|s)?\\s+for|concern\\b', /concern/),
  hedge('suspicio|suspect'),
  hedge('suggest', /\bs\/o\b/),
  ...many(hedge, 'likel|unlikel', /likel|\?/),
  hedge('probab', /\bprob\b|\?/),
  hedge('possib', QUERY),
  hedge('in\\s+keeping', /in\s+keeping|\bc\/w\b|consistent|compatib/),
  hedge('consistent\\s+with', /\bc\/w\b|consistent/),
  hedge('compatible\\s+with', /\bc\/w\b|compatib/),
  hedge('(?:cannot|can\\s?not|can.t)\\s+be\\s+(?:excluded|ruled\\s+out)', /exclud|\br\/o\b|rule\s+out/),
  hedge('(?:may|could|might)\\s+(?:represent|be|reflect|indicate)', /\?|\bposs|\bmay\b|\bcould\b|\bmight\b/),
  hedge('favou?r'),
  hedge('presum'),
  hedge('appear(?:s|ed|ing)?\\s+to'),
  hedge('indicat'),
  hedge('represent'),
  hedge('typical\\s+of|characteristic\\s+of|diagnostic\\s+of|pathognomonic'),

  // Advice the AI made up: the senior's own advice is the only recommendation (H28).
  ...many(advice, 'mri|pet\\b|ultrasound|usg|sonograph|scintigraph|biops|endoscop|colonoscop|angiograph|aspirat'),
  ...many(advice, 'follow-?up|referral|multidisciplinary|staging|management\\b|surveillance|resection'),

  // Causes and mechanisms the senior did not write.
  cause('secondary\\s+to'),
  cause('due\\s+to', /\bd\/t\b/),
  ...many(cause, 'caused\\s+by|resulting\\s+from|resultant|consequen'),
  cause('complicat'),

  // Severity: the senior's grade, never ours (H7).
  severity('mild'),
  severity('moderate'),
  severity('severe'),
  severity('marked'),
  severity('gross'),
  ...many(severity, 'massive|extensive|profound'),
  severity('minimal'),
];

const NEGATOR = /\b(?:no|nor|not|without|nil|none|neither|absent|absence|negative|free\s+of)\b/i;
const CLAUSE_BREAK = /\b(?:but|however|although|though|whereas|while|except|apart\s+from|other\s+than)\b|,\s+and\s+(?=(?:a|an|the|there|with|this|it)\b)/gi;
const NEGATED_AFTER = /^[^.;:]{0,30}?\b(?:is|are|was|were)?\s*(?:not\s+(?:seen|identified|demonstrated|visuali[sz]ed|present|evident|noted)|absent|excluded)\b/i;

/** One line per bullet or numbered point, without markers. The editor lists count only their non-blank rows, so line indexes agree. */
export const splitLines = (markdown: string): string[] =>
  markdown
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

function negatedAt(sentence: string, start: number, end: number): boolean {
  const before = sentence.slice(0, start);
  CLAUSE_BREAK.lastIndex = 0;
  let scopeStart = 0;
  for (let m = CLAUSE_BREAK.exec(before); m; m = CLAUSE_BREAK.exec(before)) scopeStart = m.index + m[0].length;
  if (NEGATOR.test(before.slice(scopeStart))) return true;
  return NEGATED_AFTER.test(sentence.slice(end));
}

interface Reference {
  text: string;
  numbers: Set<string>;
}

function referenceOf(r: Source): Reference | null {
  // Legacy cases have no trustworthy transcription; manual reports have none at all.
  if (r.auditStatus === 'LEGACY') return null;
  const text = `${r.verbatimTranscription ?? ''}\n${r.ownerNotes ?? ''}\n${r.sourceText ?? ''}`.replace(/\[\?\]/g, ' ').toLowerCase();
  if (text.trim().length < 15) return null;
  return { text, numbers: new Set(text.match(/\d+(?:\.\d+)?/g) ?? []) };
}

const writtenInNote = (e: Entry, ref: Reference) => e.probe.test(ref.text) || (e.written?.test(ref.text) ?? false);

interface Place {
  key: string;
  section: WordingSection;
  where: string;
  /** Findings rows carry the standard normal statements ("no obstruction"); the red box, impression and recommendations must not. */
  ignoreNegated?: boolean;
}

function scan(text: string, place: Place, ref: Reference, out: WordingFlag[], seen: Set<string>) {
  const push = (kind: WordingKind, sentence: string, index: number, length: number) => {
    const match = sentence.slice(index, index + length);
    const term = match.toLowerCase();
    const id = `${place.key}|${term}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      key: place.key,
      section: place.section,
      where: place.where,
      term,
      kind,
      before: (index > 45 ? '…' : '') + sentence.slice(Math.max(0, index - 45), index),
      match,
      after: sentence.slice(index + length, index + length + 45) + (index + length + 45 < sentence.length ? '…' : ''),
    });
  };

  for (const sentence of text.split(/(?<=[.;!?])\s+|\n+/)) {
    for (const e of LEXICON) {
      e.re.lastIndex = 0;
      for (let m = e.re.exec(sentence); m; m = e.re.exec(sentence)) {
        if (place.ignoreNegated && e.negatable && negatedAt(sentence, m.index, m.index + m[0].length)) continue;
        if (!writtenInNote(e, ref)) push(e.kind, sentence, m.index, m[0].length);
      }
    }
    for (const m of sentence.matchAll(/\d+(?:\.\d+)?/g)) {
      if (!ref.numbers.has(m[0])) push('number', sentence, m.index ?? 0, m[0].length);
    }
  }
}

/** Serious terms and numbers in the report that the senior's note does not contain (empty when there is nothing to compare). */
export function checkWording(r: Source): WordingFlag[] {
  const ref = referenceOf(r);
  if (!ref) return [];
  const out: WordingFlag[] = [];
  const seen = new Set<string>();

  // The red box prints only on an urgent case (print/[id].astro), so text left in it after urgent is cleared is not checked.
  if (r.isUrgent && r.urgentFindings?.trim()) scan(r.urgentFindings, { key: 'urgent', section: 'urgent', where: 'Red box' }, ref, out, seen);

  let sections: unknown = [];
  try {
    sections = JSON.parse(r.findingsJson);
  } catch {
    // an unreadable findings list has nothing to scan
  }
  if (Array.isArray(sections)) {
    sections.forEach((s: { title?: string; items?: { structure?: string; content?: string }[] }, si) => {
      (s?.items ?? []).forEach((item, ii) => {
        const label = `Findings · ${item.structure?.trim() || s.title?.trim() || 'region'}`;
        scan(`${item.structure ?? ''}. ${item.content ?? ''}`, { key: `findings:${si}:${ii}`, section: 'findings', where: label, ignoreNegated: true }, ref, out, seen);
      });
    });
  }
  splitLines(r.impressionMarkdown).forEach((line, i) => scan(line, { key: `impression:${i}`, section: 'impression', where: `Impression point ${i + 1}` }, ref, out, seen));
  splitLines(r.recommendationsMarkdown).forEach((line, i) =>
    scan(line, { key: `recommendations:${i}`, section: 'recommendations', where: `Recommendation ${i + 1}` }, ref, out, seen),
  );
  return out;
}

/** Identity of a flag set: the same terms in the same sections give the same signature, wherever they sit. */
export const wordingSignature = (flags: WordingFlag[]): string =>
  Array.from(new Set(flags.map((f) => `${f.kind}:${f.term}@${f.section}`)))
    .sort()
    .join('|');
