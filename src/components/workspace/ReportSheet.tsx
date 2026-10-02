import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { ListPlus, Plus, Siren, Trash2, X } from 'lucide-react';
import { parseFindings, type FindingItem, type FindingSection, type ReportItem, type ReportPatch } from '../../lib/report';
import { INSTITUTION, documentRef } from '../../lib/institution';
import { cn } from '../../lib/cn';
import { AutoTextarea } from '../ui/auto-textarea';
import { IconButton, Tooltip } from '../ui/overlay';
import { Skeleton } from '../ui/status';
import { longDate, toLines } from './format';

/* Document fields read as printed text until hovered or focused. */
const field =
  'w-full min-w-0 rounded-[3px] bg-transparent outline-none transition-[background-color,box-shadow] duration-fast ease-standard placeholder:text-muted/80 placeholder:font-normal placeholder:not-italic';
const editable = 'hover:bg-accent-soft/55 focus:bg-sheet focus:shadow-[0_0_0_2px_rgb(var(--accent)/0.5)]';

const fieldClass = (readOnly: boolean, extra?: string) => cn(field, !readOnly && editable, readOnly && 'cursor-text', extra);

/** Wrapping single-line values (names, structures): Enter never inserts a line break. */
const singleLine = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter') e.preventDefault();
};

export const SECTION_IDS = ['patient', 'technique', 'findings', 'impression'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

const NO_FLAGS: ReadonlySet<string> = new Set();

interface ReportSheetProps {
  report: ReportItem;
  readOnly: boolean;
  onPatch: (patch: ReportPatch) => void;
  /** Keys of lines containing wording the senior never wrote (lib/wording.ts), ringed in amber until the resident confirms. */
  flaggedKeys?: ReadonlySet<string>;
  /** Play the "developing" reveal (fresh AI draft just landed). */
  developing?: boolean;
}

/** The live twin of the issued A4 report: the PDF's letterhead, hierarchy and impression card, editable in place. */
export function ReportSheet({ report: r, readOnly, onPatch, developing, flaggedKeys = NO_FLAGS }: ReportSheetProps) {
  const reveal = (index: number): { className?: string; style?: CSSProperties } =>
    developing
      ? { className: 'motion-safe:animate-develop motion-reduce:animate-in motion-reduce:fade-in-0', style: { animationDelay: `${index * 90}ms` } }
      : {};

  return (
    <article className="mx-auto w-full max-w-[52rem] rounded-[6px] bg-sheet font-document text-sheet-ink shadow-sheet ring-1 ring-sheet-line/70 [container:sheet/inline-size]">
      <Letterhead developing={developing} />
      <div className="px-4 pb-8 wide:px-10 wide:pb-10">
        <section id="patient" data-section className={cn('scroll-mt-16 pt-1', reveal(0).className)} style={reveal(0).style}>
          <MetaGrid r={r} readOnly={readOnly} onPatch={onPatch} />
        </section>

        <SheetSection id="technique" title="Technique" tag="Acquisition Parameters" developing={developing} {...reveal(1)}>
          <AutoTextarea
            value={r.technique}
            readOnly={readOnly}
            onChange={(e) => onPatch({ technique: e.target.value })}
            placeholder="Technique as performed, e.g. contrast-enhanced CT of the abdomen and pelvis with multiplanar reformations."
            aria-label="Technique"
            className={fieldClass(readOnly, 'px-1.5 py-1 text-md leading-relaxed')}
          />
        </SheetSection>

        <AnimatePresence initial={false}>
          {r.isUrgent && (
            <motion.div
              key="urgent"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <UrgentBox r={r} readOnly={readOnly} onPatch={onPatch} flagged={flaggedKeys.has('urgent')} />
            </motion.div>
          )}
        </AnimatePresence>

        <SheetSection id="findings" title="Findings" tag="RadLex Organ Grouping" developing={developing} {...reveal(2)}>
          <FindingsEditor json={r.findingsJson} readOnly={readOnly} flaggedKeys={flaggedKeys} onChange={(findingsJson) => onPatch({ findingsJson })} />
        </SheetSection>

        <section
          id="impression"
          data-section
          className={cn('mt-7 scroll-mt-16 rounded-[4px] border border-sheet-line border-l-4 border-l-brand bg-sheet-tint/45 px-4 py-3.5 sm:px-5', reveal(3).className)}
          style={reveal(3).style}
        >
          <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-ink">Impression</h2>
          <ListEditor
            markdown={r.impressionMarkdown}
            numbered
            readOnly={readOnly}
            flagPrefix="impression"
            flaggedKeys={flaggedKeys}
            label="Impression"
            placeholder="Key diagnosis or finding, with side, level and key measurement"
            addLabel="Add impression point"
            itemClass="font-semibold"
            onChange={(impressionMarkdown) => onPatch({ impressionMarkdown })}
          />
          <div className="mt-3 border-t border-sheet-line pt-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent">Recommendations</h3>
            <ListEditor
              markdown={r.recommendationsMarkdown}
              readOnly={readOnly}
              flagPrefix="recommendations"
              flaggedKeys={flaggedKeys}
              label="Recommendations"
              placeholder="The senior's advice first; otherwise “Clinical correlation is advised.”"
              addLabel="Add recommendation"
              onChange={(recommendationsMarkdown) => onPatch({ recommendationsMarkdown })}
            />
          </div>
        </section>

        <SignOff r={r} />
      </div>
    </article>
  );
}

const crestClass = 'h-9 w-9 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/5 dark:ring-white/15 wide:h-12 wide:w-12';

function Letterhead({ developing }: { developing?: boolean }) {
  const draw = developing ? 'motion-safe:animate-rule-draw' : '';
  return (
    <div className="px-4 pt-5 wide:px-10 wide:pt-7" aria-hidden>
      <div className="flex items-center gap-3 wide:gap-4">
        <img src="/assets/gmc_crest_300dpi.png" alt="" className={crestClass} />
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="text-sm font-black uppercase tracking-[-0.005em] text-brand-ink wide:text-lg">{INSTITUTION.department}</p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.03em] text-sheet-ink/75">{INSTITUTION.hospital}</p>
          <p className="mt-1 hidden text-xs text-sheet-ink/70 wide:block">
            <strong className="font-bold">HOD:</strong> {INSTITUTION.hod} <span className="text-faint">•</span> <strong className="font-bold">Senior Registrars:</strong>{' '}
            {INSTITUTION.seniorRegistrars}
          </p>
        </div>
        <img src="/assets/gth_crest_300dpi.png" alt="" className={crestClass} />
      </div>
      {/* The printed two-cell stripe: navy 70 / cobalt 30; it draws itself when a fresh draft lands. */}
      <div className="mt-3 flex h-[3px] overflow-hidden rounded-full">
        <span className={cn('w-[70%] origin-left bg-brand dark:bg-[#2C4F94]', draw)} />
        <span className={cn('flex-1 origin-left bg-accent', draw)} style={developing ? { animationDelay: '320ms' } : undefined} />
      </div>
    </div>
  );
}

function SheetSection({
  id,
  title,
  tag,
  developing,
  className,
  style,
  children,
}: {
  id?: string;
  title: string;
  tag?: string;
  developing?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section id={id} data-section={id ? '' : undefined} className={cn('scroll-mt-16 pt-7', className)} style={style}>
      <h2 className="relative flex items-baseline justify-between gap-3 pb-1 text-sm font-extrabold uppercase tracking-[0.08em] text-brand-ink">
        <span>{title}</span>
        {tag && <span className="text-xs font-bold tracking-[0.1em] text-faint">{tag}</span>}
        <span
          aria-hidden
          className={cn('absolute inset-x-0 -bottom-px h-[1.5px] origin-left bg-accent', developing && 'motion-safe:animate-rule-draw')}
          style={developing ? { animationDelay: style?.animationDelay } : undefined}
        />
      </h2>
      <div className="pt-3">{children}</div>
    </section>
  );
}

/** The printed sign-off and footer: fixed parts of every issued report, shown so the twin ends where the page ends. */
function SignOff({ r }: { r: ReportItem }) {
  return (
    <footer aria-label="Printed sign-off" className="mt-8">
      <div className="grid gap-4 border-t border-sheet-line pt-3 wide:grid-cols-2 wide:gap-0">
        <div className="wide:border-r wide:border-sheet-line wide:pr-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Primary Reporting Radiologists</p>
          <ul className="mt-1.5 space-y-0.5 text-sm leading-snug">
            {INSTITUTION.reportingRadiologists.map((doc) => (
              <li key={doc.name}>
                <span className="font-bold text-sheet-ink">{doc.name}</span> <span className="text-muted">— {doc.qualification}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="wide:pl-5 wide:text-right">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Reviewed &amp; Approved By (Consultants)</p>
          <p className="mt-1.5 text-md font-black text-brand-ink">{INSTITUTION.hod}</p>
          <p className="text-sm font-bold text-sheet-ink/80">{INSTITUTION.hodQualification}</p>
          <p className="mt-0.5 text-sm text-muted">{INSTITUTION.seniorRegistrars} (Senior Registrars)</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-sheet-line pt-2 text-xs text-muted">
        <span>{INSTITUTION.footer}</span>
        <span className="font-mono">Document Ref: {documentRef(r.tokenNumber, r.id)}</span>
      </div>
    </footer>
  );
}

/* ---------- Patient & study grid (the PDF's meta box) ---------- */

function MetaGrid({ r, readOnly, onPatch }: { r: ReportItem; readOnly: boolean; onPatch: (p: ReportPatch) => void }) {
  const input = (key: keyof ReportPatch, value: string | null, extra?: string, placeholder?: string) => (
    <input
      value={value ?? ''}
      readOnly={readOnly}
      placeholder={placeholder ?? 'Not stated'}
      onChange={(e) => onPatch({ [key]: e.target.value } as ReportPatch)}
      className={fieldClass(readOnly, cn('-mx-1 px-1 py-0.5 text-md font-semibold text-sheet-ink', extra))}
    />
  );
  // Long values wrap instead of being clipped.
  const text = (key: keyof ReportPatch, value: string | null, label: string, extra?: string) => (
    <AutoTextarea
      value={value ?? ''}
      readOnly={readOnly}
      placeholder="Not stated"
      aria-label={label}
      onKeyDown={singleLine}
      onChange={(e) => onPatch({ [key]: e.target.value } as ReportPatch)}
      className={fieldClass(readOnly, cn('-mx-1 px-1 py-0.5 text-md font-semibold leading-snug text-sheet-ink', extra))}
    />
  );

  return (
    <div className="mt-4">
      <div className="grid grid-flow-row-dense grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-sheet-line bg-sheet-line wide:grid-flow-row wide:grid-cols-4">
        <Cell label="Patient name" className="col-span-2 wide:col-span-1">
          {text('patientName', r.patientName, 'Patient name', 'uppercase')}
        </Cell>
        <Cell label="Token / Radiology ID">
          <div className="flex min-w-0 items-baseline font-mono text-md font-extrabold text-brand-ink">
            {r.tokenNumber.trim() && <span aria-hidden>#</span>}
            {input('tokenNumber', r.tokenNumber, 'font-mono font-extrabold text-brand-ink tabular-nums', '—')}
          </div>
        </Cell>
        <Cell label="Age / Gender">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            {input('age', r.age, 'w-auto min-w-[3ch] max-w-full [field-sizing:content]', 'Age')}
            <span className="text-faint">/</span>
            {input('gender', r.gender, 'w-auto min-w-[3ch] max-w-full [field-sizing:content]', 'Gender')}
          </div>
        </Cell>
        <Cell label="Date of exam">{input('studyDate', r.studyDate, 'tabular-nums', 'YYYY-MM-DD')}</Cell>
        <Cell label="Modality & protocol" className="col-span-2">
          {text('modality', r.modality, 'Modality and protocol', 'text-brand-ink')}
        </Cell>
        <Cell label="Reporting date">
          <span className="px-0 py-0.5 text-md font-semibold tabular-nums text-sheet-ink/80">{longDate(r.reportingDate) || '—'}</span>
        </Cell>
        <Cell label="Referring clinician" className="col-span-2 wide:col-span-1">
          {text('referringClinician', r.referringClinician, 'Referring clinician', 'text-base')}
        </Cell>
        <Cell label="Clinical indication" className="col-span-2 wide:col-span-3">
          <AutoTextarea
            value={r.clinicalHistory ?? ''}
            readOnly={readOnly}
            placeholder="Not stated in source"
            onChange={(e) => onPatch({ clinicalHistory: e.target.value })}
            aria-label="Clinical indication"
            className={fieldClass(readOnly, '-mx-1 px-1 py-0.5 text-base italic leading-snug text-sheet-ink/85')}
          />
        </Cell>
        <Cell label="Comparison" className="col-span-2 wide:col-span-1 wide:text-right">
          <AutoTextarea
            value={r.comparison ?? ''}
            readOnly={readOnly}
            placeholder="Not stated in source"
            onChange={(e) => onPatch({ comparison: e.target.value })}
            aria-label="Comparison"
            className={fieldClass(readOnly, '-mx-1 px-1 py-0.5 text-base leading-snug text-sheet-ink/80 wide:text-right')}
          />
        </Cell>
      </div>
      <label className="mt-2 flex items-center justify-end gap-2 text-xs text-muted">
        <span>MR number</span>
        <span className="text-faint">(not printed)</span>
        <input
          value={r.mrNumber ?? ''}
          readOnly={readOnly}
          placeholder="—"
          onChange={(e) => onPatch({ mrNumber: e.target.value })}
          className={fieldClass(readOnly, 'w-40 px-1 py-0.5 text-right font-sans text-sm tabular-nums text-ink-2')}
        />
      </label>
    </div>
  );
}

function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    // justify-between: when one label in a row wraps, the values still share a baseline row.
    <label className={cn('flex min-w-0 flex-col justify-between gap-0.5 bg-sheet px-3 py-2 transition-colors duration-fast focus-within:bg-accent-soft/35', className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Critical box (the PDF's critical alert) ---------- */

function UrgentBox({ r, readOnly, onPatch, flagged }: { r: ReportItem; readOnly: boolean; onPatch: (p: ReportPatch) => void; flagged?: boolean }) {
  const missing = !r.urgentFindings?.trim();
  return (
    <section id="urgent" data-flag-key="urgent" aria-label="Critical clinical notification" className={cn('mt-6 scroll-mt-16 rounded-[4px] border border-danger/25 border-l-4 border-l-danger bg-danger-soft/70 px-4 py-3', flagged && 'ring-2 ring-warning')}>
      <h2 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-danger">
        <Siren className="h-3.5 w-3.5" aria-hidden />
        Critical clinical notification
      </h2>
      <AutoTextarea
        value={r.urgentFindings ?? ''}
        readOnly={readOnly}
        onChange={(e) => onPatch({ urgentFindings: e.target.value })}
        placeholder="The urgent findings, exactly as they should print"
        aria-label="Urgent findings"
        className={fieldClass(readOnly, 'mt-1.5 px-1 py-0.5 text-md font-bold leading-snug text-danger')}
      />
      <AutoTextarea
        value={r.urgentCallLog ?? ''}
        readOnly={readOnly}
        onChange={(e) => onPatch({ urgentCallLog: e.target.value })}
        placeholder="Call log: who was informed, when and by whom (written by you, never by the AI)"
        aria-label="Urgent call log"
        className={fieldClass(readOnly, 'mt-1 px-1 py-0.5 text-sm italic leading-snug text-danger/85')}
      />
      {missing && !readOnly && <p className="mt-1.5 font-sans text-xs font-medium text-danger">The critical box prints only once the urgent findings are filled in.</p>}
    </section>
  );
}

/* ---------- Findings: regions → structures ---------- */

const blankItem = (): FindingItem => ({ structure: '', content: '', isAbnormal: false });

function FindingsEditor({ json, readOnly, flaggedKeys, onChange }: { json: string; readOnly: boolean; flaggedKeys: ReadonlySet<string>; onChange: (json: string) => void }) {
  const sections = useMemo(() => parseFindings(json), [json]);
  const root = useRef<HTMLDivElement>(null);

  const emit = (next: FindingSection[]) => onChange(JSON.stringify(next));
  const focusLater = (selector: string) => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(selector)?.focus());
  const setSection = (si: number, patch: Partial<FindingSection>) => emit(sections.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setItem = (si: number, ii: number, patch: Partial<FindingItem>) =>
    setSection(si, { items: sections[si].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) });

  const addItem = (si: number) => {
    setSection(si, { items: [...sections[si].items, blankItem()] });
    focusLater(`[data-structure="${si}-${sections[si].items.length}"]`);
  };
  const addSection = () => {
    emit([...sections, { title: '', items: [blankItem()] }]);
    focusLater(`[data-title="${sections.length}"]`);
  };
  const removeWithUndo = (next: FindingSection[], message: string) => {
    const previous = json;
    emit(next);
    toast(message, { action: { label: 'Undo', onClick: () => onChange(previous) } });
  };

  if (!sections.length) {
    return readOnly ? (
      <p className="py-2 text-md italic text-muted">No findings recorded.</p>
    ) : (
      <div className="rounded-[4px] border border-dashed border-sheet-line px-4 py-6 text-center font-sans">
        <p className="text-base text-muted">No findings yet. Draft them with the AI, or start with the first region.</p>
        <button
          type="button"
          onClick={addSection}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong/80 bg-surface px-3 text-sm font-medium text-ink-2 shadow-xs transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Plus className="h-4 w-4" />
          Add a region
        </button>
      </div>
    );
  }

  return (
    <div ref={root} className="space-y-4">
      {sections.map((s, si) => (
        <div key={si} className="group/section">
          <div className="flex items-center gap-2">
            <input
              data-title={si}
              value={s.title}
              readOnly={readOnly}
              placeholder="Region or system"
              aria-label="Region or system"
              onChange={(e) => setSection(si, { title: e.target.value })}
              className={fieldClass(
                readOnly,
                'w-auto min-w-[4ch] max-w-full !bg-sheet-tint px-2 py-0.5 text-sm font-extrabold uppercase tracking-[0.05em] text-brand-ink [field-sizing:content] hover:!bg-accent-soft focus:!bg-sheet',
              )}
            />
            {!readOnly && (
              <div className="ml-auto flex items-center opacity-0 transition-opacity duration-fast group-focus-within/section:opacity-100 group-hover/section:opacity-100 [@media(pointer:coarse)]:opacity-100">
                <IconButton label="Add a finding to this region" size="icon-sm" onClick={() => addItem(si)}>
                  <ListPlus className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Remove this region"
                  size="icon-sm"
                  onClick={() => removeWithUndo(sections.filter((_, i) => i !== si), `Removed ${s.title.trim() || 'region'}`)}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            )}
          </div>

          <ul className="mt-1.5 space-y-0.5">
            <AnimatePresence initial={false}>
              {s.items.map((it, ii) => (
                <motion.li
                  key={ii}
                  data-flag-key={`findings:${si}:${ii}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'group/item relative grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-1 rounded-md py-0.5 pr-8 transition-colors duration-base wide:grid-cols-[1.5rem_11rem_minmax(0,1fr)]',
                    it.isAbnormal && 'bg-warning-soft/50',
                    flaggedKeys.has(`findings:${si}:${ii}`) && 'ring-2 ring-warning',
                  )}
                >
                  <Tooltip content={it.isAbnormal ? 'Abnormal finding · click to mark normal' : 'Normal statement · click to mark abnormal'} side="left">
                    <button
                      type="button"
                      disabled={readOnly}
                      aria-pressed={!!it.isAbnormal}
                      aria-label={it.isAbnormal ? 'Abnormal finding (mark as normal)' : 'Normal statement (mark as abnormal)'}
                      onClick={() => setItem(si, ii, { isAbnormal: !it.isAbnormal })}
                      className="grid h-8 w-6 place-items-center rounded disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition-[background-color,transform,box-shadow] duration-base ease-out',
                          it.isAbnormal ? 'scale-125 bg-warning shadow-[0_0_0_3px_rgb(var(--warning)/0.18)]' : 'bg-accent',
                        )}
                      />
                    </button>
                  </Tooltip>
                  <AutoTextarea
                    data-structure={`${si}-${ii}`}
                    value={it.structure}
                    readOnly={readOnly}
                    placeholder="Structure"
                    aria-label="Structure"
                    onKeyDown={singleLine}
                    onChange={(e) => setItem(si, ii, { structure: e.target.value })}
                    className={fieldClass(readOnly, 'px-1 py-1 text-md font-semibold leading-relaxed text-sheet-ink')}
                  />
                  <AutoTextarea
                    value={it.content}
                    readOnly={readOnly}
                    placeholder="Finding"
                    aria-label={`${it.structure || 'Finding'} text`}
                    onChange={(e) => setItem(si, ii, { content: e.target.value })}
                    className={fieldClass(readOnly, cn('col-start-2 px-1 py-1 text-md leading-relaxed text-sheet-ink/90 wide:col-start-3', it.isAbnormal && 'font-medium text-sheet-ink'))}
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Remove ${it.structure || 'finding'}`}
                      onClick={() =>
                        removeWithUndo(
                          sections.map((sec, i) => (i === si ? { ...sec, items: sec.items.filter((_, j) => j !== ii) } : sec)),
                          `Removed ${it.structure.trim() || 'finding'}`,
                        )
                      }
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded text-muted opacity-0 transition-[opacity,background-color,color] duration-fast hover:bg-surface-3 hover:text-ink focus-visible:opacity-100 group-hover/item:opacity-100 [@media(pointer:coarse)]:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={addSection}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-sheet-line py-2 font-sans text-sm font-medium text-muted transition-colors duration-fast hover:border-accent/50 hover:bg-accent-soft/40 hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          Add region
        </button>
      )}
    </div>
  );
}

/* ---------- Numbered / bulleted lists (impression, recommendations) ---------- */

function ListEditor({
  markdown,
  numbered,
  readOnly,
  label,
  placeholder,
  addLabel,
  itemClass,
  flagPrefix,
  flaggedKeys,
  onChange,
}: {
  markdown: string;
  numbered?: boolean;
  readOnly: boolean;
  flagPrefix: string;
  flaggedKeys: ReadonlySet<string>;
  label: string;
  placeholder: string;
  addLabel: string;
  itemClass?: string;
  onChange: (markdown: string) => void;
}) {
  const [items, setItems] = useState(() => toLines(markdown));
  const emitted = useRef(markdown);
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Adopt outside changes (case switch, fresh AI draft) but not the echo of our own edits.
  useEffect(() => {
    if (markdown !== emitted.current) {
      emitted.current = markdown;
      setItems(toLines(markdown));
    }
  }, [markdown]);

  const commit = (next: string[], focus?: number) => {
    setItems(next);
    const clean = next.map((s) => s.trim()).filter(Boolean);
    const md = numbered ? clean.map((s, i) => `${i + 1}. ${s}`).join('\n') : clean.join('\n');
    emitted.current = md;
    onChange(md);
    if (focus !== undefined) requestAnimationFrame(() => refs.current[focus]?.focus());
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit([...items.slice(0, i + 1), '', ...items.slice(i + 1)], i + 1);
    } else if (e.key === 'Backspace' && items[i] === '' && items.length > 1) {
      e.preventDefault();
      commit(items.filter((_, j) => j !== i), Math.max(0, i - 1));
    }
  };

  const rows = items.length ? items : readOnly ? [] : [''];

  return (
    <div className="mt-1.5">
      {rows.length === 0 && <p className="py-1 text-md italic text-muted">None recorded.</p>}
      <ol aria-label={label} className="space-y-0.5">
        {rows.map((text, i) => (
          <li key={i} data-flag-key={`${flagPrefix}:${i}`} className={cn('flex items-start gap-1.5 rounded-md', flaggedKeys.has(`${flagPrefix}:${i}`) && 'ring-2 ring-warning')}>
            <span className={cn('w-5 shrink-0 select-none pt-[0.3rem] text-right text-md tabular-nums', numbered ? 'font-semibold text-brand-ink' : 'text-accent')} aria-hidden>
              {numbered ? `${i + 1}.` : '–'}
            </span>
            <AutoTextarea
              ref={(el: HTMLTextAreaElement | null) => {
                refs.current[i] = el;
              }}
              value={text}
              readOnly={readOnly}
              placeholder={i === 0 ? placeholder : ''}
              aria-label={`${label} ${i + 1}`}
              onKeyDown={onKeyDown(i)}
              onChange={(e) => commit(rows.map((t, j) => (j === i ? e.target.value : t)))}
              className={fieldClass(readOnly, cn('px-1 py-1 text-md leading-snug', itemClass))}
            />
          </li>
        ))}
      </ol>
      {!readOnly && (
        <button
          type="button"
          onClick={() => commit([...rows, ''], rows.length)}
          className="ml-6 mt-1 inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-sans text-sm font-medium text-muted transition-colors duration-fast hover:bg-accent-soft/50 hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

/* ---------- Waiting for the AI: the sheet's own empty structure, values still to come ---------- */

const META_LABELS: [string, string, string][] = [
  ['Patient name', 'col-span-2 wide:col-span-1', 'w-32'],
  ['Token / Radiology ID', '', 'w-16'],
  ['Age / Gender', '', 'w-24'],
  ['Date of exam', '', 'w-24'],
  ['Modality & protocol', 'col-span-2', 'w-56'],
  ['Reporting date', '', 'w-20'],
  ['Referring clinician', 'col-span-2 wide:col-span-1', 'w-28'],
  ['Clinical indication', 'col-span-2 wide:col-span-3', 'w-72'],
  ['Comparison', 'col-span-2 wide:col-span-1', 'w-24'],
];

export function SheetSkeleton() {
  const line = (w: string) => <Skeleton className={cn('h-3.5', w)} />;
  return (
    <article aria-busy aria-label="Report being drafted" className="mx-auto w-full max-w-[52rem] rounded-[6px] bg-sheet font-document shadow-sheet ring-1 ring-sheet-line/70 [container:sheet/inline-size]">
      <Letterhead />
      <div className="px-4 pb-10 wide:px-10 wide:pb-12">
        <div className="mt-4 grid grid-flow-row-dense grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-sheet-line bg-sheet-line wide:grid-flow-row wide:grid-cols-4">
          {META_LABELS.map(([label, span, width]) => (
            <div key={label} className={cn('flex min-w-0 flex-col gap-2 bg-sheet px-3 py-2.5', span)}>
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
              {line(`max-w-full ${width}`)}
            </div>
          ))}
        </div>

        <SheetSection title="Technique" tag="Acquisition Parameters">
          <div className="space-y-2">
            {line('w-full')}
            {line('w-3/5')}
          </div>
        </SheetSection>

        <SheetSection title="Findings" tag="RadLex Organ Grouping">
          <div className="space-y-4">
            {[3, 2].map((rows, g) => (
              <div key={g}>
                <Skeleton className="h-5 w-36 rounded-[3px]" />
                <ul className="mt-2.5 space-y-2.5">
                  {Array.from({ length: rows }, (_, i) => (
                    <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-1 wide:grid-cols-[1.5rem_11rem_minmax(0,1fr)]">
                      <span className="mx-auto h-2 w-2 rounded-full bg-accent/30" />
                      <Skeleton className="hidden h-3.5 w-24 wide:block" />
                      <Skeleton className={cn('h-3.5', i % 2 ? 'w-4/5' : 'w-full')} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SheetSection>

        <section className="mt-7 rounded-[4px] border border-sheet-line border-l-4 border-l-brand bg-sheet-tint/45 px-4 py-3.5 wide:px-5">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-ink">Impression</h2>
          <div className="mt-3 space-y-2.5">
            {line('w-11/12')}
            {line('w-3/4')}
          </div>
          <div className="mt-3 border-t border-sheet-line pt-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent">Recommendations</h3>
            <div className="mt-2.5">{line('w-2/3')}</div>
          </div>
        </section>
      </div>
    </article>
  );
}
