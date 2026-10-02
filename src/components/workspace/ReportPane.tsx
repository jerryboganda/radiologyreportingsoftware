import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  CircleAlert,
  Download,
  History,
  LoaderCircle,
  LockOpen,
  MessageCircleQuestion,
  NotebookPen,
  PenLine,
  RotateCcw,
  Siren,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from 'lucide-react';
import { isBlankDraft, type ReportItem, type ReportPatch } from '../../lib/report';
import type { WordingFlag } from '../../lib/wording';
import { cn } from '../../lib/cn';
import { AutoTextarea } from '../ui/auto-textarea';
import { Button } from '../ui/button';
import { clarifications, elapsed, longDate } from './format';
import { ReportSheet, SECTION_IDS, SheetSkeleton, type SectionId } from './ReportSheet';
import { WordingList } from './WordingList';

const SECTION_LABELS: Record<SectionId, string> = { patient: 'Patient', technique: 'Technique', findings: 'Findings', impression: 'Impression' };

interface ReportPaneProps {
  report: ReportItem;
  readOnly: boolean;
  engineOnline: boolean;
  developing: boolean;
  onPatch: (patch: ReportPatch) => void;
  onAi: () => void;
  onDequeue: () => void;
  onReopen: () => void;
  onDownload: () => void;
  /** Serious terms/numbers in the report that the senior's note does not contain (lib/wording.ts). */
  flags: WordingFlag[];
  /** The resident already confirmed exactly these terms. */
  wordingConfirmed: boolean;
}

/** Right-hand pane: section navigation, the state banner, the report sheet and the (unprinted) notes for the AI. */
export function ReportPane({ report: r, readOnly, engineOnline, developing, onPatch, onAi, onDequeue, onReopen, onDownload, flags, wordingConfirmed }: ReportPaneProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState<SectionId>('patient');
  const waiting = r.status === 'QUEUED' || r.status === 'PROCESSING';
  const showSkeleton = waiting && isBlankDraft(r);
  const wordingPending = flags.length > 0 && !wordingConfirmed;
  const flaggedKeys = useMemo(() => new Set(wordingPending ? flags.map((f) => f.key) : []), [flags, wordingPending]);

  // Scroll-spy over the sheet's sections.
  useEffect(() => {
    const root = scroller.current;
    if (!root || showSkeleton) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SectionId);
      },
      { root, rootMargin: '-10% 0px -65% 0px' },
    );
    SECTION_IDS.forEach((id) => {
      const el = root.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [r.id, showSkeleton]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setActive('patient');
  }, [r.id]);

  const jump = (id: SectionId) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const jumpToFlag = (flag: WordingFlag) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.current?.querySelector(`[data-flag-key="${flag.key}"]`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  const notesVisible = !waiting && r.status !== 'FINALIZED' ? true : Boolean(r.ownerNotes?.trim());

  return (
    <div ref={scroller} className="relative h-full overflow-y-auto bg-canvas">
      <div className="sticky top-0 z-10 border-b border-line/80 bg-canvas/95 px-3 sm:px-6">
        <div className="mx-auto flex h-11 max-w-[52rem] items-center gap-2">
          <nav
            aria-label="Report sections"
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]"
          >
            {SECTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => jump(id)}
                aria-current={active === id ? 'location' : undefined}
                disabled={showSkeleton}
                className={cn(
                  'relative isolate h-7 shrink-0 rounded-md px-2.5 text-sm font-medium transition-colors duration-fast disabled:opacity-40',
                  active === id && !showSkeleton ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {active === id && !showSkeleton && (
                  <motion.span layoutId="section-pill" className="absolute inset-0 -z-10 rounded-md bg-surface shadow-xs ring-1 ring-line" transition={{ type: 'spring', bounce: 0, duration: 0.3 }} />
                )}
                {SECTION_LABELS[id]}
              </button>
            ))}
          </nav>
          {!readOnly && (
            <button
              type="button"
              aria-pressed={!!r.isUrgent}
              aria-label={r.isUrgent ? 'Urgent (click to clear)' : 'Mark urgent'}
              onClick={() => onPatch({ isUrgent: !r.isUrgent })}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors duration-fast sm:px-2.5',
                r.isUrgent ? 'bg-danger-soft text-danger' : 'text-muted hover:bg-surface-3 hover:text-ink',
              )}
            >
              <Siren className="h-3.5 w-3.5" />
              <span className="max-sm:sr-only">{r.isUrgent ? 'Urgent' : 'Mark urgent'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-24 pt-4 sm:px-6 sm:pt-6">
        <StatusBanner
          key={`${r.status}:${r.isArchived}`}
          report={r}
          engineOnline={engineOnline}
          onAi={onAi}
          onDequeue={onDequeue}
          onReopen={onReopen}
          onDownload={onDownload}
          onWriteNotes={() => {
            notesRef.current?.focus();
            notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />

        {!showSkeleton && flags.length > 0 && <WordingBanner flags={flags} confirmed={wordingConfirmed} onSelect={jumpToFlag} />}

        <div key={`${r.id}`} className="animate-in fade-in-0 duration-200">
          {showSkeleton ? <SheetSkeleton /> : <ReportSheet report={r} readOnly={readOnly} onPatch={onPatch} developing={developing} flaggedKeys={flaggedKeys} />}
        </div>

        {notesVisible && (
          <section aria-labelledby="ai-notes" className="mx-auto mt-4 w-full max-w-[52rem] rounded-lg border border-line bg-surface px-4 py-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted" aria-hidden />
              <h2 id="ai-notes" className="text-base font-semibold text-ink">
                Notes for the AI
              </h2>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">Not printed</span>
            </div>
            <p className="mt-1 text-sm text-muted">Corrections the AI must follow the next time it reads this note. Your corrections outrank the note (AGENTS.md §2).</p>
            <AutoTextarea
              ref={notesRef}
              value={r.ownerNotes ?? ''}
              readOnly={readOnly}
              placeholder="e.g. Line 3 reads “Lt kidney”, not “Rt”. Lesion is 15 mm."
              onChange={(e) => onPatch({ ownerNotes: e.target.value })}
              className="mt-2.5 min-h-16 rounded-md border border-line bg-surface-2 px-3 py-2 text-base leading-relaxed text-ink transition-[border-color,box-shadow,background-color] duration-fast placeholder:text-muted hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 read-only:hover:border-line"
            />
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- Wording check: terms the senior never wrote ---------- */

function WordingBanner({ flags, confirmed, onSelect }: { flags: WordingFlag[]; confirmed: boolean; onSelect: (flag: WordingFlag) => void }) {
  const terms = new Set(flags.map((f) => f.term)).size;
  return (
    <div
      role={confirmed ? 'status' : 'alert'}
      className={cn(
        'mx-auto mb-4 w-full max-w-[52rem] rounded-lg border px-4 py-3',
        confirmed ? 'border-line bg-surface text-ink-2' : 'border-warning/30 bg-warning-soft text-ink-2',
      )}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', confirmed ? 'text-muted' : 'text-warning')} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">
            {confirmed
              ? `You confirmed ${terms} term${terms === 1 ? '' : 's'} that the senior’s note does not contain`
              : `Check the wording: ${terms} term${terms === 1 ? '' : 's'} not in the senior’s note`}
          </p>
          {!confirmed && (
            <p className="mt-0.5 text-sm leading-relaxed">
              The AI used words or numbers the senior didn’t write. Replace them with the senior’s own words, or confirm them with the senior when you approve. Click one to jump to it.
            </p>
          )}
          <WordingList flags={flags} onSelect={onSelect} className="mt-2" />
        </div>
      </div>
    </div>
  );
}

/* ---------- State banners: what the case needs from the resident right now ---------- */

function StatusBanner({
  report: r,
  engineOnline,
  onAi,
  onDequeue,
  onReopen,
  onDownload,
  onWriteNotes,
}: {
  report: ReportItem;
  engineOnline: boolean;
  onAi: () => void;
  onDequeue: () => void;
  onReopen: () => void;
  onDownload: () => void;
  onWriteNotes: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (r.status !== 'PROCESSING') return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [r.status]);

  if (r.isArchived) {
    return <Banner tone="neutral" icon={<History />} title="Archived" body="This case is out of the active list. Its data and photo are kept; restore it from the ⋯ menu." />;
  }

  switch (r.status) {
    case 'QUEUED':
      return engineOnline ? (
        <Banner tone="info" icon={<LoaderCircle className="motion-safe:animate-spin" />} title="Queued for the AI" body="Gemini 3.8 Flash will pick this note up in a moment. The report fills in here when it’s ready." />
      ) : (
        <Banner
          tone="warning"
          icon={<WifiOff />}
          title="The AI engine is offline"
          body={
            <>
              Start it on the reporting PC with <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.92em] text-ink">npm run worker</code>, or take this case off the queue and write it yourself.
            </>
          }
          action={<Button size="sm" onClick={onDequeue}><PenLine className="h-4 w-4" />Edit manually</Button>}
        />
      );
    case 'PROCESSING':
      return (
        <Banner
          tone="info"
          icon={<LoaderCircle className="motion-safe:animate-spin" />}
          title="Gemini 3.8 Flash is reading the note"
          body="Transcribing, building the finding ledger and running the AGENTS.md final audit. This usually takes a few minutes."
          aside={<span className="font-semibold tabular-nums text-accent">{elapsed(r.updatedAt)}</span>}
        />
      );
    case 'BLOCKED': {
      const questions = clarifications(r.verificationSheetMarkdown);
      return (
        <Banner
          tone="warning"
          icon={<MessageCircleQuestion />}
          title="The AI needs a clarification"
          body={
            questions.length ? (
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            ) : (
              'Open the audit sheet to see what it could not read with certainty.'
            )
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onWriteNotes}>
                <NotebookPen className="h-4 w-4" />
                Answer in notes
              </Button>
              <Button size="sm" variant="primary" onClick={onAi}>
                <RotateCcw className="h-4 w-4" />
                Re-queue
              </Button>
            </div>
          }
        />
      );
    }
    case 'FAILED':
      return (
        <Banner
          tone="danger"
          icon={<TriangleAlert />}
          title="Generation failed"
          body={
            <>
              <span className="block">The AI couldn’t finish this note. Retry, or write the report yourself.</span>
              {r.lastError && <span className="mt-1.5 block break-words font-mono text-xs leading-relaxed opacity-90">{r.lastError}</span>}
            </>
          }
          action={<Button size="sm" variant="primary" onClick={onAi}><RotateCcw className="h-4 w-4" />Retry</Button>}
        />
      );
    case 'FINALIZED':
      return (
        <Banner
          tone="success"
          icon={<BadgeCheck />}
          title="Finalized"
          body={`Issued as PDF${r.reportingDate ? ` on ${longDate(r.reportingDate)}` : ''}. Read-only: reopen it to make changes.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onReopen}><LockOpen className="h-4 w-4" />Reopen</Button>
              <Button size="sm" onClick={onDownload}><Download className="h-4 w-4" />Download again</Button>
            </div>
          }
        />
      );
    default:
      if (isBlankDraft(r)) {
        return (
          <Banner
            tone="neutral"
            icon={<Sparkles />}
            title="No report yet"
            body="Let Gemini 3.8 Flash draft it from the note, or start writing below."
            action={<Button size="sm" variant="primary" onClick={onAi}><Sparkles className="h-4 w-4" />Generate with AI</Button>}
          />
        );
      }
      if (r.auditStatus === 'LEGACY') {
        return <Banner tone="neutral" icon={<CircleAlert />} title="Legacy record" body="Created before in-app auditing. Check every finding against the note before you issue it." />;
      }
      return null;
  }
}

const TONES = {
  neutral: 'border-line bg-surface text-ink-2 [&_[data-icon]]:text-muted',
  info: 'border-accent/20 bg-accent-soft text-ink-2 [&_[data-icon]]:text-accent',
  warning: 'border-warning/25 bg-warning-soft text-ink-2 [&_[data-icon]]:text-warning',
  danger: 'border-danger/25 bg-danger-soft text-ink-2 [&_[data-icon]]:text-danger',
  success: 'border-success/25 bg-success-soft text-ink-2 [&_[data-icon]]:text-success',
} as const;

function Banner({ tone, icon, title, body, action, aside }: { tone: keyof typeof TONES; icon: ReactNode; title: string; body: ReactNode; action?: ReactNode; aside?: ReactNode }) {
  return (
    <div
      role="status"
      className={cn('mx-auto mb-4 flex w-full max-w-[52rem] animate-in fade-in-0 slide-in-from-top-1 items-start gap-3 rounded-lg border px-4 py-3 duration-300', TONES[tone])}
    >
      <span data-icon className="mt-0.5 shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-ink">{title}</p>
          {aside}
        </div>
        <div className="mt-0.5 text-sm leading-relaxed">{body}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
