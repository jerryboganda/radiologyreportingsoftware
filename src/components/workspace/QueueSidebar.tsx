import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ArchiveRestore, Camera, FilePlus2, FolderSync, ImagePlus, Inbox, Keyboard, LoaderCircle, Monitor, Moon, PanelLeftClose, RotateCcw, Search, Settings, Sun, Upload, X } from 'lucide-react';
import type { ReportItem } from '../../lib/report';
import { aiModelLabel, NO_AI_LABEL } from '../../lib/aiModel';
import { cn } from '../../lib/cn';
import { prefersReducedMotion, spring, tween } from '../../lib/motion';
import { Button, Kbd } from '../ui/button';
import { IconButton, Tooltip } from '../ui/overlay';
import { Segmented } from '../ui/segmented';
import { Skeleton, StatusChip } from '../ui/status';
import { displayName, shortDate } from './format';
import type { ThemeApi, ThemePref } from './useTheme';

export type QueueView = 'active' | 'archived';

const ACCEPT = 'image/jpeg,image/png,image/webp';

const imagesFrom = (list: FileList | null) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

/** Keyboard focus ring for file-picker labels (the input itself is sr-only). */
const LABEL_FOCUS = 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface';

/**
 * The product mark: a report sheet carrying the printed letterhead's navy/cobalt stripe, lit from above.
 * Under the workspace's one-shot .intro (global.css) the lines draw, the cobalt cell pops and a gloss sweeps;
 * once .intro is gone a remount (the phone drawer) renders it complete, so it never replays.
 */
export function BrandMark({ className }: { className?: string }) {
  // useId keeps the gradient and clip ids unique when the phone-bar mark and the drawer mark coexist.
  const id = useId().replace(/[^\w-]/g, '');
  const line = (i: number) => ({ className: 'mark-line', style: { '--i': i } as CSSProperties });
  return (
    <svg viewBox="0 0 32 32" className={cn('brand-mark h-8 w-8 shrink-0 drop-shadow-[0_3px_8px_rgb(var(--accent)/0.35)]', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}t`} x2="0" y2="1">
          <stop className="[stop-color:#1E4078] dark:[stop-color:#2C5CC8]" />
          <stop offset="1" className="[stop-color:#0F2C59] dark:[stop-color:#1B3A73]" />
        </linearGradient>
        <linearGradient id={`${id}g`}>
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <rect width="32" height="32" rx="8" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id}t)`} />
      <rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      <rect x="8" y="8.5" width="16" height="2.2" rx="1.1" fill="#fff" {...line(0)} />
      <rect x="8" y="13.4" width="11" height="2.2" rx="1.1" fill="#fff" fillOpacity=".72" {...line(1)} />
      <rect x="8" y="18.3" width="13.5" height="2.2" rx="1.1" fill="#fff" fillOpacity=".72" {...line(2)} />
      <rect x="8" y="23.2" width="11.2" height="2.4" rx="1.2" fill="#fff" {...line(3)} />
      <rect x="19.2" y="23.2" width="4.8" height="2.4" rx="1.2" fill="#2563EB" className="mark-cell" />
      {/* The gloss rests outside the clip at both ends and its edges are transparent, so it leaves nothing behind. */}
      <g clipPath={`url(#${id}c)`}>
        <g transform="rotate(20 16 16)">
          <rect className="mark-gloss" x="-16" y="-14" width="12" height="60" fill={`url(#${id}g)`} />
        </g>
      </g>
    </svg>
  );
}

interface QueueSidebarProps {
  reports: ReportItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: QueueView;
  onViewChange: (view: QueueView) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  counts: { active: number; archived: number; failed: number };
  /** Drafts whose wording contains terms the senior never wrote (and the resident has not confirmed). */
  flaggedIds: ReadonlySet<string>;
  engineOnline: boolean;
  engineBusy: boolean;
  /** The worker's live engine and model; the row names them as the app does everywhere else. */
  engineEngine: string | null;
  engineModel: string | null;
  onOpenSettings: () => void;
  onIngest: (files: File[]) => Promise<void>;
  onSyncInput: () => Promise<void>;
  onRetryFailed: () => Promise<void>;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  theme: ThemeApi;
  onShowShortcuts: () => void;
  onCollapse?: () => void;
  /** Cases not loaded yet: skeleton rows instead of a misleading "No cases yet / Active 0". */
  loading?: boolean;
  /** Drawer mode: a close button in the brand bar. */
  onClose?: () => void;
  /** Opens Create Report (typed or dictated findings). */
  onCreate?: () => void;
}

export function QueueSidebar(props: QueueSidebarProps) {
  const { reports, selectedId, view, onViewChange, query, onQueryChange, searchRef, counts, loading } = props;
  const listRef = useRef<HTMLDivElement>(null);
  // Membership only: a status-only poll leaves it unchanged, so rows neither measure nor move.
  const order = reports.map((r) => r.id).join();

  // Stable row handlers that always call the latest props, so memoised rows skip re-rendering on every poll.
  const latest = useRef(props);
  latest.current = props;
  const select = useCallback((id: string) => latest.current.onSelect(id), []);
  const archive = useCallback((id: string) => latest.current.onArchive(id), []);
  const restore = useCallback((id: string) => latest.current.onRestore(id), []);

  // Each view starts at the top. Declared first, so bringing the selected row into view below wins.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [view]);

  // j/k, a new case or the drawer opening can select a row outside the scroller: bring it into view (instant, so rapid j/k stays crisp).
  // Scrolls only the list; scrollIntoView would also shift the collapsed sidebar's clipping wrapper sideways.
  useEffect(() => {
    const box = listRef.current;
    const row = box?.querySelector('[aria-current="true"]');
    if (!box || !row) return;
    const b = box.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop += r.top - b.top;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom;
  }, [selectedId, loading]);

  // Roving tabindex: the whole list is one tab stop (the selected row, else the first).
  const tabStop = reports.some((r) => r.id === selectedId) ? selectedId : reports[0]?.id;

  return (
    // Glass comes from the wrapper the shell renders; the brand bar carries the cobalt glow rule shared with the case header.
    <aside aria-label="Cases" className="flex h-full w-full flex-col">
      <div className="relative flex h-14 shrink-0 items-center gap-2.5 border-b border-line/70 px-3 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:glow-rule">
        <BrandMark />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-md font-semibold tracking-[-0.01em] text-ink">PolytronX</div>
          <div className="text-xs text-muted">Radiology reporting</div>
        </div>
        {props.onCollapse && (
          <IconButton label="Hide case list" shortcut="[" onClick={props.onCollapse} className="-mr-1.5">
            <PanelLeftClose className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        {props.onClose && (
          <IconButton label="Close case list" onClick={props.onClose} className="-mr-1.5">
            <X className="h-[18px] w-[18px]" />
          </IconButton>
        )}
      </div>

      <div data-intro style={{ '--i': 1 } as CSSProperties} className="space-y-2.5 border-b border-line/70 p-3">
        <Intake onFiles={props.onIngest} onCreate={props.onCreate} />
        <div className="flex gap-2">
          <BusyButton icon={<FolderSync className="h-4 w-4" />} onRun={props.onSyncInput} className="flex-1">
            Sync input folder
          </BusyButton>
          {counts.failed > 0 && (
            <BusyButton icon={<RotateCcw className="h-4 w-4" />} onRun={props.onRetryFailed} tooltip="Send failed cases back to the AI">
              Retry {counts.failed}
            </BusyButton>
          )}
        </div>
        <EngineStatus
          checking={loading}
          online={props.engineOnline}
          busy={props.engineBusy}
          engine={props.engineEngine}
          model={props.engineModel}
          onOpenSettings={props.onOpenSettings}
        />
      </div>

      <div data-intro style={{ '--i': 2 } as CSSProperties} className="space-y-2.5 px-3 pb-1 pt-3">
        <label className="relative block">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onQueryChange('');
                e.currentTarget.blur();
              } else if (e.key === 'ArrowDown') {
                const row = listRef.current?.querySelector<HTMLElement>('[data-case-row][tabindex="0"]');
                if (row) {
                  e.preventDefault();
                  row.focus();
                }
              } else if (e.key === 'Enter' && query.trim() && reports[0]) {
                props.onSelect(reports[0].id);
              }
            }}
            placeholder="Search name, token, study"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            aria-keyshortcuts="/"
            className="h-9 w-full rounded-md border border-line bg-surface/60 pl-8 pr-9 text-base text-ink transition-[border-color,box-shadow,background-color] duration-fast placeholder:text-muted hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 coarse:h-11 coarse:text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              className="touch-target absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted transition-colors duration-fast hover:bg-surface-3 hover:text-ink coarse:right-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 coarse:hidden">/</Kbd>
          )}
        </label>
        <p className="sr-only" aria-live="polite">
          {query && !loading ? `${reports.length} matching case${reports.length === 1 ? '' : 's'}` : ''}
        </p>
        <Segmented
          label="Case list"
          value={view}
          onChange={onViewChange}
          className="flex w-full"
          options={[
            { value: 'active', label: 'Active', count: loading ? undefined : counts.active },
            { value: 'archived', label: 'Archived', count: loading ? undefined : counts.archived },
          ]}
        />
      </div>

      {/* One intro block for the whole list, never per row. */}
      <div ref={listRef} data-intro style={{ '--i': 3 } as CSSProperties} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1.5 [scrollbar-gutter:stable]">
        {loading ? (
          <div role="status" aria-busy="true" aria-label="Loading cases">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="mb-0.5 space-y-2 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/*
              Keyed by view: Archived slides in from the right, Active from the left, and each switch is a fresh
              AnimatePresence (initial={false}) so rows don't cascade. Within a view, search and real arrivals and
              removals animate. popLayout takes a leaving row out of flow (hence relative) while the rest FLIP;
              isolate keeps every row's selection wash and landed sweep under the row content as they glide.
            */}
            <ul
              key={view}
              style={{ '--dir': view === 'archived' ? 1 : -1 } as CSSProperties}
              className="relative isolate motion-safe:animate-list-in"
              aria-label={view === 'active' ? 'Active cases' : 'Archived cases'}
              onKeyDown={(e) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
                const rows = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-case-row]'));
                const current = (document.activeElement as HTMLElement | null)?.closest('li')?.querySelector<HTMLButtonElement>('[data-case-row]');
                const i = current ? rows.indexOf(current) : -1;
                if (i === -1) return;
                e.preventDefault();
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
                rows[next]?.focus();
              }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {reports.map((r) => (
                  <CaseRow
                    key={r.id}
                    order={order}
                    report={r}
                    flagged={props.flaggedIds.has(r.id)}
                    selected={r.id === selectedId}
                    tabStop={r.id === tabStop}
                    onSelect={select}
                    onArchive={archive}
                    onRestore={restore}
                  />
                ))}
              </AnimatePresence>
            </ul>
            {reports.length === 0 && <ListEmpty view={view} query={query} onClear={() => onQueryChange('')} />}
          </>
        )}
      </div>

      <div data-intro style={{ '--i': 4 } as CSSProperties} className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-line/70 px-3">
        <ThemeSwitch theme={props.theme} />
        <IconButton label="Keyboard shortcuts" shortcut="?" side="top" size="icon-sm" onClick={props.onShowShortcuts} className="coarse:hidden">
          <Keyboard className="h-4 w-4" />
        </IconButton>
      </div>
    </aside>
  );
}

const CaseRow = memo(function CaseRow({
  ref,
  order,
  report: r,
  flagged,
  selected,
  tabStop,
  onSelect,
  onArchive,
  onRestore,
}: {
  /** React 19 ref-as-prop: popLayout's PopChild composes it to measure a leaving row. */
  ref?: Ref<HTMLLIElement>;
  /** The list's id order: layout is measured only when membership changes, never on a status-only poll. */
  order: string;
  report: ReportItem;
  flagged: boolean;
  selected: boolean;
  tabStop: boolean;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const blank = !r.modality.trim();
  const untitled = !r.patientName.trim();

  // The AI just finished this case: one cobalt bloom and sweep as the progress bar leaves, in step with the develop reveal.
  const prev = useRef(r.status);
  const [landed, setLanded] = useState(false);
  useLayoutEffect(() => {
    if (prev.current === 'PROCESSING' && r.status !== 'PROCESSING' && !prefersReducedMotion()) setLanded(true);
    prev.current = r.status;
  }, [r.status]);

  return (
    <motion.li
      ref={ref}
      layout="position"
      layoutDependency={order}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: tween.exit }}
      transition={{ layout: spring.layout, default: tween.enter }}
      className="group relative"
    >
      {/* One wash glides from row to row; bottom-0.5 matches the button's mb-0.5. */}
      {selected && (
        <motion.span
          layoutId="case-selection"
          layoutDependency={order}
          aria-hidden
          className="absolute inset-x-0 bottom-0.5 top-0 -z-10 rounded-lg bg-accent-soft shadow-edge ring-1 ring-inset ring-accent/25"
          transition={spring.layout}
        />
      )}
      {landed && <span aria-hidden className="land" onAnimationEnd={(e) => e.animationName === 'land' && setLanded(false)} />}
      <button
        type="button"
        data-case-row
        tabIndex={tabStop ? 0 : -1}
        onClick={() => onSelect(r.id)}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          // The focus outline is drawn inside the row, clear of its neighbours.
          'press mb-0.5 flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left [--press:0.985] focus-visible:outline-offset-[-2px] coarse:pr-14',
          // Selected is the gliding wash behind the button.
          !selected && 'hover:bg-surface/75 hover:ring-1 hover:ring-inset hover:ring-line/80 active:bg-surface-3/80 dark:hover:bg-surface-3/55',
        )}
      >
        <span className="flex w-full items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-base font-semibold transition-colors duration-base', untitled ? 'font-medium italic text-muted' : 'text-ink', selected && 'text-brand-ink')}>
            {displayName(r)}
          </span>
          <StatusChip status={r.status} archived={r.isArchived} flagged={flagged} />
        </span>
        <span className="flex w-full items-center gap-2 text-sm text-muted">
          {r.tokenNumber.trim() && <span className={cn('shrink-0 font-semibold tabular-nums', selected ? 'text-brand-ink' : 'text-ink-2')}>#{r.tokenNumber}</span>}
          <span className="min-w-0 flex-1 truncate">{blank ? (r.status === 'QUEUED' || r.status === 'PROCESSING' ? 'Awaiting transcription' : 'No study yet') : r.modality}</span>
          <span className="shrink-0 tabular-nums transition-opacity duration-fast group-focus-within:opacity-0 group-hover:opacity-0 coarse:!opacity-100">{shortDate(r.createdAt)}</span>
        </span>
      </button>

      <Tooltip content={r.isArchived ? 'Restore to active' : 'Archive case'} side="right">
        <button
          type="button"
          tabIndex={tabStop ? 0 : -1}
          aria-label={r.isArchived ? `Restore ${displayName(r)}` : `Archive ${displayName(r)}`}
          onClick={() => (r.isArchived ? onRestore : onArchive)(r.id)}
          className={cn(
            'absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-md text-muted opacity-0 transition-[opacity,background-color,color] duration-fast hover:bg-surface hover:text-ink focus-visible:opacity-100 focus-visible:outline-offset-[-2px] group-hover:opacity-100',
            // Touch has no hover: always visible, a full 44px target centred on the row.
            'coarse:bottom-auto coarse:right-1 coarse:top-1/2 coarse:h-11 coarse:w-11 coarse:-translate-y-1/2 coarse:opacity-100',
          )}
        >
          {r.isArchived ? <ArchiveRestore className="h-3.5 w-3.5 coarse:h-4 coarse:w-4" /> : <Archive className="h-3.5 w-3.5 coarse:h-4 coarse:w-4" />}
        </button>
      </Tooltip>

      {r.status === 'PROCESSING' && !r.isArchived && (
        <span className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-accent/15" aria-hidden>
          <span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-indeterminate motion-reduce:w-full motion-reduce:opacity-50" />
        </span>
      )}
    </motion.li>
  );
});

function ListEmpty({ view, query, onClear }: { view: QueueView; query: string; onClear: () => void }) {
  return (
    // Fades up once the leaving rows have cleared.
    <div className="flex flex-col items-center px-6 py-10 text-center animate-in fade-in-0 slide-in-from-bottom-1 duration-enter delay-75 fill-mode-backwards">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface/70 text-muted shadow-xs ring-1 ring-line">
        {query ? <Search className="h-[18px] w-[18px]" /> : <Inbox className="h-[18px] w-[18px]" />}
      </span>
      <p className="text-base font-medium text-ink">{query ? 'No matching cases' : view === 'archived' ? 'Nothing archived' : 'No cases yet'}</p>
      <p className="mt-1 text-sm text-muted">
        {query ? 'Try a patient name, token or study.' : view === 'archived' ? 'Archived cases stay in the database and can be restored.' : 'Add a note photo or create a report above to start a case.'}
      </p>
      {query && (
        <Button size="sm" variant="ghost" className="mt-3" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}

/**
 * Ways in. Desktop: a click-to-browse photo tile (drops anywhere on the window go to DropOverlay) beside Create Report.
 * Touch has no drag and drop: one compact row of camera, photo library and Create Report instead.
 */
function Intake({ onFiles, onCreate }: { onFiles: (files: File[]) => Promise<void>; onCreate?: () => void }) {
  const [busy, setBusy] = useState(false);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = imagesFrom(e.target.files);
    e.target.value = '';
    if (!files.length || busy) return;
    setBusy(true);
    try {
      await onFiles(files);
    } finally {
      setBusy(false);
    }
  };

  const tile = cn(
    'group flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg px-3 py-3.5 text-center short:py-2.5',
    'transition-[border-color,background-color,color] duration-base ease-standard',
  );
  const disc = 'mb-0.5 grid h-9 w-9 place-items-center rounded-full bg-surface text-accent shadow-xs ring-1 ring-line transition-transform duration-base ease-out group-hover:-translate-y-0.5 short:hidden';
  const touchButton = cn(
    'flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-line-strong/80 bg-surface px-1.5 py-2 text-center text-xs font-medium leading-tight text-ink-2 shadow-xs',
    'press active:bg-surface-2 [--press:0.97] [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-accent',
    LABEL_FOCUS,
    busy && 'pointer-events-none opacity-60',
  );

  return (
    <>
      <div className={cn('grid gap-2 coarse:hidden', onCreate && 'grid-cols-2')}>
        <label className={cn(tile, 'border border-dashed border-line-strong/80 bg-surface/55 hover:border-accent/60 hover:bg-accent-soft/50', LABEL_FOCUS, busy && 'pointer-events-none')}>
          <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={onPick} disabled={busy} />
          <span className={disc}>{busy ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <Upload className="h-4 w-4" />}</span>
          <span className="max-w-full truncate text-base font-medium text-ink">{busy ? 'Adding…' : onCreate ? 'Add photos' : 'Add note photos'}</span>
          <span className="max-w-full truncate text-xs text-muted short:hidden">{onCreate ? 'Drop or browse' : 'Drop or browse · JPG, PNG, WebP'}</span>
        </label>
        {onCreate && (
          <button type="button" onClick={onCreate} className={cn(tile, 'border border-line-strong/80 bg-surface shadow-xs hover:bg-surface-2')}>
            <span className={disc}>
              <FilePlus2 className="h-4 w-4" />
            </span>
            <span className="max-w-full truncate text-base font-medium text-ink">Create Report</span>
            <span className="max-w-full truncate text-xs text-muted short:hidden">Type or dictate</span>
          </button>
        )}
      </div>

      <div className={cn('hidden gap-2 coarse:grid', onCreate ? 'grid-cols-3' : 'grid-cols-2')}>
        <label className={touchButton}>
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} disabled={busy} />
          {busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Camera />}
          Take photo
        </label>
        <label className={touchButton}>
          <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={onPick} disabled={busy} />
          <ImagePlus />
          Choose photos
        </label>
        {onCreate && (
          <button type="button" onClick={onCreate} className={touchButton}>
            <FilePlus2 />
            Create Report
          </button>
        )}
      </div>
    </>
  );
}

function BusyButton({
  icon,
  onRun,
  tooltip,
  className,
  children,
}: {
  icon: ReactNode;
  onRun: () => Promise<void>;
  tooltip?: string;
  className?: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const button = (
    <Button
      size="sm"
      loading={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        try {
          await onRun();
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && icon}
      {children}
    </Button>
  );
  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
}

function EngineStatus({
  checking,
  online,
  busy,
  engine,
  model,
  onOpenSettings,
}: {
  checking?: boolean;
  online: boolean;
  busy: boolean;
  engine: string | null;
  model: string | null;
  onOpenSettings: () => void;
}) {
  const label = aiModelLabel({ engineEngine: engine, engineModel: model });
  return (
    <div className="flex items-center gap-2 px-0.5 text-xs text-muted">
      <Tooltip
        side="right"
        content={
          checking
            ? 'Waiting for the first report from the AI worker.'
            : online
              ? 'The AI worker is connected and processing the queue one case at a time.'
              : 'The AI worker has not checked in for 15 seconds. Queued cases wait until it reconnects.'
        }
      >
        <span tabIndex={0} role="status" className="flex min-w-0 flex-1 items-center gap-2 rounded-sm">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full transition-colors duration-base', online && !checking ? 'bg-success shadow-[0_0_0_3px_rgb(var(--success)/0.16)]' : 'bg-faint', online && busy && 'motion-safe:animate-soft-pulse')}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">
            {checking ? 'Checking AI engine…' : online ? (busy ? 'AI engine working' : 'AI engine online') : 'AI engine offline'}
            {!checking && label !== NO_AI_LABEL && <span className="text-faint"> · {label}</span>}
          </span>
        </span>
      </Tooltip>
      <IconButton label="AI settings" size="icon-sm" variant="ghost" onClick={onOpenSettings} className="-my-1">
        <Settings className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Match system', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
];

function ThemeSwitch({ theme }: { theme: ThemeApi }) {
  return (
    <Segmented
      label="Theme"
      value={theme.pref}
      onChange={theme.choose}
      options={THEME_OPTIONS.map((o) => ({ ...o, iconOnly: true }))}
    />
  );
}
