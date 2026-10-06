import type { CSSProperties, ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  Check,
  CloudOff,
  Columns2,
  Download,
  Ellipsis,
  FilePlus2,
  Keyboard,
  LoaderCircle,
  LockOpen,
  Maximize2,
  PenLine,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { isBlankDraft, type ReportItem } from '../../lib/report';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tooltip } from '../ui/overlay';
import { StatusChip } from '../ui/status';
import { ageSex, displayName } from './format';
import type { CaseAction, SaveState } from './useReports';

export interface AiAction {
  label: string;
  icon: ReactNode;
  hint: string;
}

/** The one AI action that makes sense for the case's current state, if any. */
export function aiActionFor(r: ReportItem, aiLabel: string): AiAction | null {
  if (r.isArchived) return null;
  switch (r.status) {
    case 'DRAFT':
      return isBlankDraft(r)
        ? { label: 'Generate with AI', icon: <Sparkles />, hint: `Send this note to ${aiLabel}` }
        : { label: 'Regenerate', icon: <Sparkles />, hint: 'Ask the AI to draft this report again' };
    case 'BLOCKED':
      return { label: 'Re-queue', icon: <RotateCcw />, hint: 'Send back to the AI with your notes' };
    case 'FAILED':
      return { label: 'Retry', icon: <RotateCcw />, hint: 'Try the AI generation again' };
    default:
      return null;
  }
}

interface CaseHeaderProps {
  report: ReportItem;
  saveState: SaveState;
  onSaveNow: () => void;
  leading: ReactNode;
  focusMode: boolean;
  onToggleFocus?: () => void;
  canApprove: boolean;
  approveHint: string;
  onApprove: () => void;
  /** The finalized PDF is being generated again. */
  approveBusy?: boolean;
  onAi: () => void;
  /** The AI request is in flight. */
  aiBusy?: boolean;
  onCreate: () => void;
  onAudit: () => void;
  /** Opens the print preview after pending edits are saved. */
  onPrint: () => void;
  onShowShortcuts: () => void;
  onAction: (action: CaseAction) => void;
  /** The model actually running, named in the Generate with AI tooltip. */
  aiLabel: string;
  /** The draft has wording the senior never wrote that the resident has not confirmed. */
  wordingPending: boolean;
}

export function CaseHeader({
  report: r,
  saveState,
  onSaveNow,
  leading,
  focusMode,
  onToggleFocus,
  canApprove,
  approveHint,
  onApprove,
  approveBusy,
  onAi,
  aiBusy,
  onCreate,
  onAudit,
  onPrint,
  onShowShortcuts,
  onAction,
  aiLabel,
  wordingPending,
}: CaseHeaderProps) {
  const ai = aiActionFor(r, aiLabel);
  const finalized = r.status === 'FINALIZED';
  const details = ageSex(r);
  const name = displayName(r);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-line/70 glass px-2.5 [container:bar/inline-size] after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:glow-rule sm:gap-3 sm:px-4">
      {leading}

      {/* Keyed by case: the title cluster slides 4px in the direction of travel (--dir from <main>). */}
      <div
        key={r.id}
        data-vt-name="case-title"
        data-intro-delay
        style={{ '--i': 0 } as CSSProperties}
        className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden motion-safe:animate-swap-in"
      >
        <h1 title={name} className={cn('min-w-[5rem] truncate text-lg font-semibold tracking-[-0.015em] text-ink', !r.patientName.trim() && 'font-medium italic text-muted')}>
          {name}
        </h1>
        {r.tokenNumber.trim() && (
          <span className="hidden shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-sm font-semibold tabular-nums text-brand-ink md:inline">#{r.tokenNumber}</span>
        )}
        {details && <span className="hidden shrink-0 text-sm text-muted xl:inline">{details}</span>}
        <StatusChip status={r.status} archived={r.isArchived} flagged={wordingPending} className="shrink-0" />
        <SaveIndicator state={saveState} onRetry={onSaveNow} />
      </div>

      <div data-vt-name="case-actions" data-intro style={{ '--i': 1 } as CSSProperties} className="flex shrink-0 items-center gap-1">
        <HeaderAction label="Create Report" hint="Type or dictate the findings for a new report" icon={<FilePlus2 />} onClick={onCreate} />
        {ai && <HeaderAction label={ai.label} hint={ai.hint} icon={ai.icon} onClick={onAi} loading={aiBusy} />}
        <HeaderAction label="Audit sheet" hint="AGENTS.md verification sheet" icon={<ShieldCheck />} onClick={onAudit} />
        <HeaderAction label="Print preview" hint="Open the A4 print layout" icon={<Printer />} href={`/print/${r.id}`} onClick={onPrint} className="max-lg:hidden" />
        {onToggleFocus && (
          <IconButton label={focusMode ? 'Show the note' : 'Focus on the report'} shortcut="F" onClick={onToggleFocus} className="max-lg:hidden">
            {focusMode ? <Columns2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </IconButton>
        )}

        <Menu>
          <Tooltip content="More actions">
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions" className="data-[state=open]:bg-surface-3 data-[state=open]:text-ink">
                <Ellipsis className="h-[18px] w-[18px]" />
              </Button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent>
            {/* Only what the bar does not already show at this width; the phone action bar carries the AI action. */}
            <MenuItem icon={<ShieldCheck />} onSelect={onAudit} className="sm:hidden">
              Audit sheet
            </MenuItem>
            <MenuItem icon={<Printer />} onSelect={onPrint} className="lg:hidden">
              Open print preview
            </MenuItem>
            {r.status === 'QUEUED' && (
              <MenuItem icon={<PenLine />} onSelect={() => onAction('dequeue')}>
                Take off the queue and edit manually
              </MenuItem>
            )}
            {finalized && (
              <MenuItem icon={<LockOpen />} onSelect={() => onAction('reopen')}>
                Reopen for editing
              </MenuItem>
            )}
            <MenuItem icon={<FilePlus2 />} onSelect={onCreate} className="sm:hidden">
              Create Report
            </MenuItem>
            <MenuSeparator />
            {r.isArchived ? (
              <MenuItem icon={<ArchiveRestore />} onSelect={() => onAction('restore')}>
                Restore to active
              </MenuItem>
            ) : (
              <MenuItem icon={<Archive />} onSelect={() => onAction('archive')}>
                Archive case
              </MenuItem>
            )}
            <MenuItem icon={<Keyboard />} shortcut="?" onSelect={onShowShortcuts}>
              Keyboard shortcuts
            </MenuItem>
          </MenuContent>
        </Menu>

        {/* One stable button: when issuing is blocked it stays focusable, and its reason is in the tooltip and announced. */}
        <Tooltip content={canApprove ? (finalized ? 'Download the issued PDF' : 'Check, then issue the PDF') : approveHint}>
          <Button
            variant="primary"
            onClick={canApprove ? onApprove : undefined}
            loading={approveBusy}
            // The case's next step until it is issued: the one shimmering control on screen.
            shimmer={canApprove && !finalized}
            aria-disabled={!canApprove || undefined}
            aria-describedby={canApprove ? undefined : 'approve-hint'}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:[--press:1] max-sm:hidden"
          >
            <Download className="h-4 w-4" />
            {finalized ? 'Download PDF' : 'Approve & download'}
          </Button>
        </Tooltip>
        {!canApprove && (
          <span id="approve-hint" className="sr-only">
            {approveHint}
          </span>
        )}
      </div>
    </header>
  );
}

/** Labelled when the header itself is wide (bar-wide); icon with tooltip below that, so the patient name is never crushed. */
function HeaderAction({
  label,
  hint,
  icon,
  onClick,
  href,
  loading,
  className,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
  className?: string;
}) {
  const iconClass = '[&_svg]:h-[18px] [&_svg]:w-[18px]';
  if (href) {
    // Kept as a link for middle-click; a plain click goes through onClick so pending edits are saved first.
    return (
      <Tooltip content={hint}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label} (opens in a new tab)`}
          onClick={(e) => {
            if (!onClick) return;
            e.preventDefault();
            onClick();
          }}
          className={cn(
            'touch-target inline-flex h-9 shrink-0 select-none items-center justify-center gap-2 rounded-md text-base font-medium text-ink-2',
            'press hover:bg-surface-3 hover:text-ink max-sm:hidden',
            'w-9 bar-wide:w-auto bar-wide:px-3',
            iconClass,
            className,
          )}
        >
          {icon}
          <span className="hidden bar-wide:inline">{label}</span>
        </a>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={hint}>
      <Button variant="ghost" onClick={onClick} loading={loading} aria-label={label} className={cn('w-9 px-0 max-sm:hidden bar-wide:w-auto bar-wide:px-3', iconClass, className)}>
        {!loading && icon}
        <span className="hidden bar-wide:inline">{label}</span>
      </Button>
    </Tooltip>
  );
}

/** Always mounted, so its live region exists before the first message; below md it shows the icon only. */
function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const content = {
    idle: null,
    error: null,
    dirty: { icon: <span className="mx-1 h-1.5 w-1.5 rounded-full bg-warning" />, text: 'Unsaved' },
    saving: { icon: <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" />, text: 'Saving…' },
    saved: { icon: <Check className="h-3.5 w-3.5 text-success motion-safe:animate-pop-in" />, text: 'Saved' },
  }[state];
  return (
    <span className="inline-flex h-6 shrink-0 items-center text-sm text-muted [--dir:1] md:min-w-[4.5rem]">
      {/* Announces outcomes only, not every keystroke's Unsaved/Saving. */}
      <span role="status" className="sr-only">
        {state === 'saved' ? 'Saved' : state === 'error' ? 'Not saved' : ''}
      </span>
      {state === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Not saved. Retry"
          className="touch-target inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-offset-[-2px]"
        >
          <CloudOff className="h-3.5 w-3.5" />
          <span className="max-md:hidden">Not saved · Retry</span>
        </button>
      ) : (
        content && (
          <span key={state} aria-hidden className="inline-flex items-center gap-1 motion-safe:animate-swap-in">
            {content.icon}
            <span className="max-md:hidden">{content.text}</span>
          </span>
        )
      )}
    </span>
  );
}
