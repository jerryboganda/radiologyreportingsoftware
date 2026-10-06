import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { hasReportBody, isBlankDraft, type ReportItem, type ReportPatch } from '../../lib/report';
import type { InstitutionProfile } from '../../lib/institution';
import type { WordingFlag } from '../../lib/wording';
import { aiCopy, aiModelLabel, type AiModelState } from '../../lib/aiModel';
import { prefersReducedMotion, spring } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { AutoTextarea } from '../ui/auto-textarea';
import { Button, type ButtonProps } from '../ui/button';
import { clarifications, elapsed, longDate, shortDate } from './format';
import { ReportSheet, SECTION_IDS, SheetSkeleton, sheetProfile, type SectionId } from './ReportSheet';
import { WordingList } from './WordingList';

const SECTION_LABELS: Record<SectionId, string> = { patient: 'Patient', technique: 'Technique', findings: 'Findings', impression: 'Impression' };

/** A banner action: a returned promise shows the button as busy until it settles. */
type Action = () => void | Promise<unknown>;

interface ReportPaneProps {
  report: ReportItem;
  readOnly: boolean;
  /** The live worker state: the banner names the model that is actually running (lib/aiModel.ts). */
  ai: AiModelState;
  developing: boolean;
  onPatch: (patch: ReportPatch) => void;
  /** Letterhead / sign-off edits, applied to this case and to every case created later. */
  onProfile: (patch: Partial<InstitutionProfile>) => void;
  /** The stored Settings profile, which the PDF prints for a case with no letterhead snapshot of its own. */
  fallbackProfile?: InstitutionProfile;
  onAi: Action;
  onDequeue: Action;
  onReopen: Action;
  onDownload: Action;
  /** Serious terms/numbers in the report that the senior's note does not contain (lib/wording.ts). */
  flags: WordingFlag[];
  /** The resident already confirmed exactly these terms. */
  wordingConfirmed: boolean;
}

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

/** Right-hand pane: section navigation, the state banner, the report sheet and the (unprinted) notes for the AI. */
export function ReportPane({
  report: r,
  readOnly,
  ai,
  developing,
  onPatch,
  onProfile,
  fallbackProfile,
  onAi,
  onDequeue,
  onReopen,
  onDownload,
  flags,
  wordingConfirmed,
}: ReportPaneProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  // While a nav jump scrolls, the spy stays quiet so the pill goes straight to the target.
  const spyLock = useRef(false);
  const pillId = useId();
  const [active, setActive] = useState<SectionId>('patient');
  const waiting = r.status === 'QUEUED' || r.status === 'PROCESSING';
  const showSkeleton = waiting && isBlankDraft(r);
  const wordingPending = flags.length > 0 && !wordingConfirmed;
  // flags is a new array on every keystroke; the set changes only when the flagged lines do.
  const flagSignature = wordingPending ? flags.map((f) => f.key).join('|') : '';
  const flaggedKeys = useMemo(() => new Set(flagSignature ? flagSignature.split('|') : []), [flagSignature]);
  const terms = new Set(flags.map((f) => f.term)).size;
  const skeletonProfile = useMemo(() => sheetProfile(r.institutionJson, fallbackProfile), [r.institutionJson, fallbackProfile]);

  // Scroll-spy over the sheet's sections.
  useEffect(() => {
    const root = scroller.current;
    if (!root || showSkeleton) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (spyLock.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SectionId);
      },
      { root, rootMargin: '-10% 0px -65% 0px' },
    );
    SECTION_IDS.forEach((id) => {
      const el = root.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });
    // On a tall pane the last section never reaches the band; at the very bottom it is the one being read.
    const onScroll = () => {
      if (!spyLock.current && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) setActive(SECTION_IDS[SECTION_IDS.length - 1]);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', onScroll);
    };
  }, [r.id, showSkeleton]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setActive('patient');
  }, [r.id]);

  // Keep the active pill in view when the nav is narrower than its pills (the right edge is faded).
  useEffect(() => {
    const bar = nav.current;
    const pill = bar?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!bar || !pill || bar.scrollWidth <= bar.clientWidth) return;
    const b = bar.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    if (p.left < b.left) bar.scrollBy({ left: p.left - b.left - 12, behavior: scrollBehavior() });
    else if (p.right > b.right - 24) bar.scrollBy({ left: p.right - b.right + 24, behavior: scrollBehavior() });
  }, [active]);

  const jump = (id: SectionId) => {
    const root = scroller.current;
    const el = root?.querySelector<HTMLElement>(`#${id}`);
    if (!root || !el) return;
    setActive(id);
    spyLock.current = true;
    const release = () => {
      spyLock.current = false;
    };
    root.addEventListener('scrollend', release, { once: true });
    window.setTimeout(release, 'onscrollend' in window ? 1500 : 600);
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    // Focus follows the jump, so the next Tab lands inside the section.
    el.focus({ preventScroll: true });
  };

  const jumpToFlag = (flag: WordingFlag) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-flag-key="${flag.key}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    el.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true });
    if (prefersReducedMotion()) return;
    // Landing pulse once the scroll settles: the line's amber halo (an ::after around the text, never on it) breathes once.
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      el.animate({ opacity: [0, 1, 0], offset: [0, 0.3, 1] }, { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::after' });
    };
    scroller.current?.addEventListener('scrollend', land, { once: true });
    window.setTimeout(land, 'onscrollend' in window ? 700 : 350);
  };

  const toggleUrgent = () => {
    const on = !r.isUrgent;
    onPatch({ isUrgent: on });
    if (!on) return;
    // The critical box opens below Technique, often above the view: bring it in and put the cursor where it is needed.
    requestAnimationFrame(() => {
      const box = scroller.current?.querySelector<HTMLElement>('#urgent');
      if (!box) return;
      box.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      Array.from(box.querySelectorAll('textarea'))
        .find((field) => !field.value.trim())
        ?.focus({ preventScroll: true });
    });
  };

  const notesVisible = Boolean(r.ownerNotes?.trim()) || !readOnly;

  return (
    <div
      ref={scroller}
      data-vt-name="report"
      className="relative h-full overflow-y-auto bg-canvas scroll-pt-14 [container:pane/inline-size] [scrollbar-gutter:stable]"
    >
      {/* Frosted canvas glass; bar-lift fades a shadow in under it over the first 32px of scroll. */}
      <div
        data-intro
        style={{ '--i': 2 } as CSSProperties}
        className="bar-lift glass-bar sticky top-0 z-10 border-b border-line/70 px-3 [--glass-tint:var(--canvas)] pane-wide:px-6"
      >
        <div className="mx-auto flex h-11 max-w-[52rem] items-center gap-2">
          {/* Full bar height, so focus rings and touch hit areas are not clipped by the horizontal scroller. */}
          <nav
            ref={nav}
            aria-label="Report sections"
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 self-stretch overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]"
          >
            {SECTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => jump(id)}
                aria-current={active === id ? 'location' : undefined}
                disabled={showSkeleton}
                className={cn(
                  'relative isolate h-7 shrink-0 rounded-md px-2.5 text-sm font-medium transition-colors duration-fast focus-visible:outline-offset-[-2px] disabled:opacity-40 coarse:after:absolute coarse:after:inset-x-0 coarse:after:-inset-y-2',
                  active === id && !showSkeleton ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {active === id && !showSkeleton && (
                  <motion.span
                    layoutId={`section-pill-${pillId}`}
                    layoutDependency={active}
                    transition={spring.layout}
                    className="absolute inset-0 -z-10 rounded-md bg-surface/90 shadow-xs ring-1 ring-line/80 forced-colors:outline forced-colors:outline-2 forced-colors:outline-[Highlight]"
                  />
                )}
                {SECTION_LABELS[id]}
              </button>
            ))}
          </nav>
          {!readOnly && (
            <button
              type="button"
              aria-pressed={!!r.isUrgent}
              onClick={toggleUrgent}
              className={cn(
                'press relative inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium pane-wide:px-2.5 coarse:after:absolute coarse:after:inset-x-0 coarse:after:-inset-y-2',
                r.isUrgent ? 'bg-danger-soft text-danger hover:bg-danger-soft/80' : 'text-muted hover:bg-surface-3 hover:text-ink',
              )}
            >
              {/* Keyed, so the siren rings once each time the case becomes urgent. */}
              <Siren key={String(!!r.isUrgent)} className={cn('h-3.5 w-3.5 origin-[50%_20%]', r.isUrgent && 'motion-safe:animate-siren')} aria-hidden />
              {/* One label in both states: aria-pressed and the red fill carry the state. Icon only while the pane is narrow. */}
              <span className="sr-only pane-wide:not-sr-only">Urgent</span>
            </button>
          )}
        </div>
      </div>

      {/* The desk light scrolls with the content; the scroller keeps its solid canvas, so scrolling stays composited. */}
      <div className="desk-light px-3 pb-24 pt-4 pane-wide:px-6 pane-wide:pt-6">
        {/* One polite region that stays mounted: each state change is announced once, never the ticking timer. */}
        <div role="status" aria-atomic={false}>
          <StatusBanner
            key={`${r.status}:${r.isArchived}`}
            report={r}
            ai={ai}
            onAi={onAi}
            onDequeue={onDequeue}
            onReopen={onReopen}
            onDownload={onDownload}
            onWriteNotes={() => {
              notesRef.current?.focus({ preventScroll: true });
              notesRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
            }}
          />
        </div>

        {/* Only the count is announced (politely), not the whole banner on every keystroke. */}
        <p className="sr-only" aria-live="polite">
          {!showSkeleton && wordingPending ? `${terms} term${terms === 1 ? '' : 's'} not in the senior’s note` : ''}
        </p>
        {!showSkeleton && flags.length > 0 && <WordingBanner flags={flags} terms={terms} confirmed={wordingConfirmed} onSelect={jumpToFlag} />}

        <div
          key={`${r.id}`}
          aria-busy={(waiting && !showSkeleton) || undefined}
          data-intro-delay="sheet"
          style={{ '--i': 2 } as CSSProperties}
          // Enters in the direction of travel through the list (--dir); a developing draft has its own reveal instead.
          // A report about to be replaced by a fresh draft dims until the new one develops.
          className={cn('relative transition-opacity duration-slow', !developing && CASE_IN, waiting && !showSkeleton && 'opacity-60')}
        >
          {/* A cobalt halo breathes once around (never on) the paper while the draft develops. */}
          {developing && (
            <span
              aria-hidden
              className="develop-halo pointer-events-none absolute inset-0 mx-auto w-full max-w-[52rem] rounded-[6px] motion-safe:animate-halo motion-reduce:hidden"
            />
          )}
          {showSkeleton ? (
            <SheetSkeleton profile={skeletonProfile} still={!ai.engineOnline} />
          ) : (
            <ReportSheet
              report={r}
              readOnly={readOnly}
              onPatch={onPatch}
              onProfile={onProfile}
              fallbackProfile={fallbackProfile}
              developing={developing}
              flaggedKeys={flaggedKeys}
            />
          )}
        </div>

        {notesVisible && (
          <section aria-labelledby="ai-notes" className="mx-auto mt-4 w-full max-w-[52rem] rounded-lg border border-line bg-surface px-4 py-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted" aria-hidden />
              <h2 id="ai-notes" className="text-base font-semibold text-ink">
                Notes for the AI
              </h2>
              <span className="inline-flex h-6 items-center rounded-full bg-surface-3 px-2 text-xs font-medium text-muted">Not printed</span>
            </div>
            <p className="mt-1 text-sm text-muted">Corrections the AI must follow the next time it reads this note. Your corrections outrank the note.</p>
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

function WordingBanner({ flags, terms, confirmed, onSelect }: { flags: WordingFlag[]; terms: number; confirmed: boolean; onSelect: (flag: WordingFlag) => void }) {
  return (
    <Banner
      region="Wording check"
      tone={confirmed ? 'neutral' : 'warning'}
      icon={<TriangleAlert />}
      title={
        confirmed
          ? `You confirmed ${terms} term${terms === 1 ? '' : 's'} that the senior’s note does not contain`
          : `Check the wording: ${terms} term${terms === 1 ? '' : 's'} not in the senior’s note`
      }
      body={
        <>
          {!confirmed &&
            'The AI used words or numbers the senior didn’t write. Replace them with the senior’s own words, or confirm them with the senior when you approve. Click one to jump to it.'}
          <WordingList flags={flags} limit={3} onSelect={onSelect} className="mt-2" />
        </>
      }
    />
  );
}

/* ---------- State banners: what the case needs from the resident right now ---------- */

/** A banner button whose handler may return a promise: busy (spinner, no second click) until it settles. */
function ActionButton({ onAction, ...props }: Omit<ButtonProps, 'onClick'> & { onAction: Action }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      {...props}
      loading={busy}
      onClick={() => {
        const pending = onAction();
        if (!(pending instanceof Promise)) return;
        setBusy(true);
        void pending.finally(() => setBusy(false));
      }}
    />
  );
}

function StatusBanner({
  report: r,
  ai,
  onAi,
  onDequeue,
  onReopen,
  onDownload,
  onWriteNotes,
}: {
  report: ReportItem;
  ai: AiModelState;
  onAi: Action;
  onDequeue: Action;
  onReopen: Action;
  onDownload: Action;
  onWriteNotes: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (r.status !== 'PROCESSING') return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [r.status]);

  // The model the worker is running now; falls back to a neutral phrase before the first heartbeat.
  const copy = aiCopy(aiModelLabel(ai));
  const engineOnline = ai.engineOnline;

  if (r.isArchived) {
    return <Banner tone="neutral" icon={<History />} title="Archived" body="This case is out of the active list. Its data and photo are kept; restore it from the ⋯ menu." />;
  }

  switch (r.status) {
    case 'QUEUED':
      return engineOnline ? (
        // Queued pulses softly, as the status chip does; only Generating spins.
        <Banner
          tone="info"
          icon={
            <span className="relative m-[5px] flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-current motion-safe:animate-soft-pulse" />
            </span>
          }
          title="Queued for the AI"
          body={copy.named.queued}
        />
      ) : (
        <Banner
          tone="warning"
          icon={<WifiOff />}
          title="The AI engine is offline"
          body="The AI worker has not checked in. Queued cases wait until it reconnects, or take this case off the queue and write it yourself."
          action={
            <ActionButton onAction={onDequeue}>
              <PenLine className="h-4 w-4" />
              Edit manually
            </ActionButton>
          }
        />
      );
    case 'PROCESSING':
      return (
        <Banner
          tone="info"
          icon={<LoaderCircle className="motion-safe:animate-spin" />}
          title={copy.named.reading}
          body="Transcribing, building the finding ledger and running the AGENTS.md final audit. This usually takes a few minutes."
          progress
          aside={
            <>
              <span aria-hidden className="font-semibold tabular-nums text-accent">
                {elapsed(r.updatedAt)}
              </span>
              <span className="sr-only">Started {shortDate(r.updatedAt)}.</span>
            </>
          }
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
              <ActionButton variant="primary" shimmer onAction={onAi}>
                <RotateCcw className="h-4 w-4" />
                Re-queue
              </ActionButton>
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
          action={
            <ActionButton variant="primary" shimmer onAction={onAi}>
              <RotateCcw className="h-4 w-4" />
              Retry
            </ActionButton>
          }
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
              <ActionButton onAction={onReopen}>
                <LockOpen className="h-4 w-4" />
                Reopen
              </ActionButton>
              <ActionButton onAction={onDownload}>
                <Download className="h-4 w-4" />
                Download again
              </ActionButton>
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
            body={copy.named.noReport}
            action={
              <ActionButton variant="primary" shimmer onAction={onAi}>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </ActionButton>
            }
          />
        );
      }
      // Says why Approve & download is still locked, for keyboard, screen-reader and touch users too.
      if (!hasReportBody(r)) {
        return <Banner tone="neutral" icon={<PenLine />} title="Not ready to issue" body="Add at least one finding and one impression point; Approve & download unlocks then." />;
      }
      if (r.auditStatus === 'LEGACY') {
        return <Banner tone="neutral" icon={<CircleAlert />} title="Legacy record" body="Created before in-app auditing. Check every finding against the note before you issue it." />;
      }
      return null;
  }
}

/** The case-switch entrance shared by the sheet and the banners: 12px in the direction of travel; a plain fade under reduced motion. */
const CASE_IN = 'motion-safe:animate-case-in motion-reduce:animate-in motion-reduce:fade-in-0 motion-reduce:duration-150';

/** Lit tiles: the state wash fading to 70% from top to bottom, one colour per tone. */
const TONES = {
  neutral: 'border-line bg-surface/80 text-ink-2 [&_[data-icon]]:text-muted',
  info: 'border-accent/20 bg-gradient-to-b from-accent-soft to-accent-soft/70 text-ink-2 [&_[data-icon]]:text-accent',
  warning: 'border-warning/25 bg-gradient-to-b from-warning-soft to-warning-soft/70 text-ink-2 [&_[data-icon]]:text-warning',
  danger: 'border-danger/25 bg-gradient-to-b from-danger-soft to-danger-soft/70 text-ink-2 [&_[data-icon]]:text-danger',
  success: 'border-success/25 bg-gradient-to-b from-success-soft to-success-soft/70 text-ink-2 [&_[data-icon]]:text-success',
} as const;

function Banner({
  tone,
  icon,
  title,
  body,
  action,
  aside,
  region,
  progress,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
  aside?: ReactNode;
  /** Names the banner as a landmark region (the live announcements live outside it). */
  region?: string;
  /** An indeterminate bar along the bottom edge while the AI works, as the case row has. */
  progress?: boolean;
}) {
  return (
    <div
      role={region ? 'region' : undefined}
      aria-label={region}
      // Arrives with the sheet on a case switch; the page-load intro only retimes it.
      data-intro-delay
      style={{ '--i': 2 } as CSSProperties}
      className={cn('relative mx-auto mb-4 flex w-full max-w-[52rem] items-start gap-3 rounded-lg border px-4 py-3 shadow-edge', CASE_IN, TONES[tone])}
    >
      <span data-icon className="mt-0.5 shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-base font-semibold text-ink">{title}</p>
          {aside}
        </div>
        <div className="mt-0.5 text-sm leading-relaxed">{body}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {progress && (
        <span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-1 h-0.5 overflow-hidden rounded-full bg-accent/15">
          <span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-indeterminate motion-reduce:w-full motion-reduce:opacity-50" />
        </span>
      )}
    </div>
  );
}
