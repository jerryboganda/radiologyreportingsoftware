import { useState, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ArchiveRestore, Camera, FolderSync, Inbox, Keyboard, Monitor, Moon, PanelLeftClose, RotateCcw, Search, Sun, Upload, X } from 'lucide-react';
import type { ReportItem } from '../../lib/report';
import { cn } from '../../lib/cn';
import { Button, Kbd } from '../ui/button';
import { IconButton, Tooltip } from '../ui/overlay';
import { Segmented } from '../ui/segmented';
import { StatusChip } from '../ui/status';
import { displayName, shortDate } from './format';
import type { ThemeApi, ThemePref } from './useTheme';

export type QueueView = 'active' | 'archived';

const ACCEPT = 'image/jpeg,image/png,image/webp';

const imagesFrom = (list: FileList | null) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

/** The product mark: a report sheet carrying the printed letterhead's navy/cobalt stripe. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-[#0F2C59] dark:fill-[#1B3A73]" />
      <rect x="8" y="8.5" width="16" height="2.2" rx="1.1" fill="#fff" />
      <rect x="8" y="13.4" width="11" height="2.2" rx="1.1" fill="#fff" fillOpacity=".72" />
      <rect x="8" y="18.3" width="13.5" height="2.2" rx="1.1" fill="#fff" fillOpacity=".72" />
      <rect x="8" y="23.2" width="11.2" height="2.4" rx="1.2" fill="#fff" />
      <rect x="19.2" y="23.2" width="4.8" height="2.4" rx="1.2" fill="#3B82F6" />
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
  engineOnline: boolean;
  engineBusy: boolean;
  onIngest: (files: File[]) => Promise<void>;
  onSyncInput: () => Promise<void>;
  onRetryFailed: () => Promise<void>;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  theme: ThemeApi;
  onShowShortcuts: () => void;
  onCollapse?: () => void;
}

export function QueueSidebar(props: QueueSidebarProps) {
  const { reports, selectedId, onSelect, view, onViewChange, query, onQueryChange, searchRef, counts } = props;

  return (
    <aside aria-label="Cases" className="flex h-full w-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
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
      </div>

      <div className="space-y-2.5 border-b border-line p-3">
        <Dropzone onFiles={props.onIngest} />
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
        <EngineStatus online={props.engineOnline} busy={props.engineBusy} />
      </div>

      <div className="space-y-2.5 px-3 pb-1 pt-3">
        <label className="relative block">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (onQueryChange(''), e.currentTarget.blur())}
            placeholder="Search name, token, study"
            className="h-9 w-full rounded-md border border-line bg-surface-2 pl-8 pr-9 text-base text-ink transition-[border-color,box-shadow,background-color] duration-fast placeholder:text-muted hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">/</Kbd>
          )}
        </label>
        <Segmented
          label="Case list"
          value={view}
          onChange={onViewChange}
          className="flex w-full"
          options={[
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'archived', label: 'Archived', count: counts.archived },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1.5">
        <ul
          aria-label={view === 'active' ? 'Active cases' : 'Archived cases'}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            const rows = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-case-row]'));
            const i = rows.indexOf(document.activeElement as HTMLButtonElement);
            if (i === -1) return;
            e.preventDefault();
            rows[Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
          }}
        >
          <AnimatePresence initial={false}>
            {reports.map((r) => (
              <CaseRow
                key={r.id}
                report={r}
                selected={r.id === selectedId}
                onSelect={() => onSelect(r.id)}
                onArchive={() => props.onArchive(r.id)}
                onRestore={() => props.onRestore(r.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
        {reports.length === 0 && <ListEmpty view={view} query={query} />}
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-line px-2.5">
        <ThemeSwitch theme={props.theme} />
        <IconButton label="Keyboard shortcuts" shortcut="?" size="icon-sm" onClick={props.onShowShortcuts}>
          <Keyboard className="h-4 w-4" />
        </IconButton>
      </div>
    </aside>
  );
}

function CaseRow({
  report: r,
  selected,
  onSelect,
  onArchive,
  onRestore,
}: {
  report: ReportItem;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const blank = !r.modality.trim();
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden"
    >
      <button
        type="button"
        data-case-row
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'mb-0.5 flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors duration-fast ease-standard',
          selected ? 'bg-accent-soft' : 'hover:bg-surface-3 active:bg-line/70',
        )}
      >
        <span className="flex w-full items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-base font-semibold', selected ? 'text-brand-ink' : 'text-ink', !r.patientName.trim() && 'font-medium italic text-muted')}>
            {displayName(r)}
          </span>
          <StatusChip status={r.status} archived={r.isArchived} />
        </span>
        <span className="flex w-full items-center gap-2 text-sm text-muted">
          {r.tokenNumber.trim() && <span className="shrink-0 font-semibold tabular-nums text-ink-2">#{r.tokenNumber}</span>}
          <span className="min-w-0 flex-1 truncate">{blank ? (r.status === 'QUEUED' || r.status === 'PROCESSING' ? 'Awaiting transcription' : 'No study yet') : r.modality}</span>
          <span className="shrink-0 tabular-nums transition-opacity duration-fast group-focus-within:opacity-0 group-hover:opacity-0 [@media(pointer:coarse)]:!opacity-100">
            {shortDate(r.createdAt)}
          </span>
        </span>
      </button>

      <Tooltip content={r.isArchived ? 'Restore to active' : 'Archive case'} side="right">
        <button
          type="button"
          aria-label={r.isArchived ? `Restore ${displayName(r)}` : `Archive ${displayName(r)}`}
          onClick={r.isArchived ? onRestore : onArchive}
          className="absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-md text-muted opacity-0 transition-[opacity,background-color,color] duration-fast hover:bg-surface hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:hidden"
        >
          {r.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
      </Tooltip>

      {r.status === 'PROCESSING' && !r.isArchived && (
        <span className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-accent/15" aria-hidden>
          <span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-indeterminate motion-reduce:w-full motion-reduce:opacity-50" />
        </span>
      )}
    </motion.li>
  );
}

function ListEmpty({ view, query }: { view: QueueView; query: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted">
        {query ? <Search className="h-[18px] w-[18px]" /> : <Inbox className="h-[18px] w-[18px]" />}
      </span>
      <p className="text-base font-medium text-ink">{query ? 'No matching cases' : view === 'archived' ? 'Nothing archived' : 'No cases yet'}</p>
      <p className="mt-1 text-sm text-muted">
        {query ? 'Try a patient name, token or study.' : view === 'archived' ? 'Archived cases stay in the database and can be restored.' : 'Add a note photo above to start a case.'}
      </p>
    </div>
  );
}

function Dropzone({ onFiles }: { onFiles: (files: File[]) => Promise<void> }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const take = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    try {
      await onFiles(files);
    } finally {
      setBusy(false);
    }
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    void take(imagesFrom(e.target.files));
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(imagesFrom(e.dataTransfer.files));
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-3.5 text-center',
          'transition-[border-color,background-color] duration-base ease-standard focus-within:ring-2 focus-within:ring-accent/30',
          over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface-2 hover:border-accent/60 hover:bg-accent-soft/50',
          busy && 'pointer-events-none',
        )}
      >
        <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={onPick} disabled={busy} />
        <span
          className={cn(
            'mb-0.5 grid h-9 w-9 place-items-center rounded-full bg-surface text-accent shadow-xs ring-1 ring-line transition-transform duration-base ease-out',
            over ? '-translate-y-0.5 scale-105' : 'group-hover:-translate-y-0.5',
          )}
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/25 border-t-accent" /> : <Upload className="h-4 w-4" />}
        </span>
        <span className="text-base font-medium text-ink">{busy ? 'Adding…' : 'Add note photos'}</span>
        <span className="text-xs text-muted">Drop or browse · JPG, PNG, WebP</span>
      </label>
      <label className="hidden h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand text-base font-medium text-on-accent shadow-sm active:scale-[0.98] [@media(pointer:coarse)]:flex">
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} disabled={busy} />
        <Camera className="h-4 w-4" />
        Take photo of note
      </label>
    </div>
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

function EngineStatus({ online, busy }: { online: boolean; busy: boolean }) {
  return (
    <Tooltip
      side="right"
      content={online ? 'The Antigravity worker is connected and processing the queue one case at a time.' : 'Start it on the reporting PC with: npm run worker'}
    >
      <div className="flex items-center gap-2 px-0.5 text-xs text-muted" role="status">
        <span className="relative flex h-2 w-2" aria-hidden>
          {online && busy && <span className="absolute inset-0 rounded-full bg-success/60 motion-safe:animate-ping" />}
          <span className={cn('relative h-2 w-2 rounded-full', online ? 'bg-success' : 'bg-faint')} />
        </span>
        <span className="truncate">
          {online ? (busy ? 'AI engine working' : 'AI engine online') : 'AI engine offline'}
          <span className="text-faint"> · Gemini 3.8 Flash</span>
        </span>
      </div>
    </Tooltip>
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
