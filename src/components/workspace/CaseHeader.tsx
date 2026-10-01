import type { ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  Check,
  CloudOff,
  Columns2,
  Download,
  Ellipsis,
  LoaderCircle,
  LockOpen,
  Maximize2,
  Menu as MenuIcon,
  PanelLeftOpen,
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
export function aiActionFor(r: ReportItem): AiAction | null {
  if (r.isArchived) return null;
  switch (r.status) {
    case 'DRAFT':
      return isBlankDraft(r)
        ? { label: 'Generate with AI', icon: <Sparkles />, hint: 'Send this note to Gemini 3.8 Flash' }
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
  onAi: () => void;
  onAudit: () => void;
  onAction: (action: CaseAction) => void;
}

export function CaseHeader({ report: r, saveState, onSaveNow, leading, focusMode, onToggleFocus, canApprove, approveHint, onApprove, onAi, onAudit, onAction }: CaseHeaderProps) {
  const ai = aiActionFor(r);
  const finalized = r.status === 'FINALIZED';
  const details = ageSex(r);
  const printHref = `/print/${r.id}`;

  const approve = (
    <Button variant="primary" onClick={onApprove} disabled={!canApprove} className="max-sm:hidden">
      <Download className="h-4 w-4" />
      {finalized ? 'Download PDF' : 'Approve & download'}
    </Button>
  );

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5 sm:gap-3 sm:px-4">
      {leading}

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1 className={cn('min-w-0 truncate text-lg font-semibold tracking-[-0.015em] text-ink', !r.patientName.trim() && 'font-medium italic text-muted')}>
          {displayName(r)}
        </h1>
        {r.tokenNumber.trim() && (
          <span className="hidden shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-sm font-semibold tabular-nums text-brand-ink sm:inline">#{r.tokenNumber}</span>
        )}
        {details && <span className="hidden shrink-0 text-sm text-muted xl:inline">{details}</span>}
        <StatusChip status={r.status} archived={r.isArchived} className="shrink-0" />
        <SaveIndicator state={saveState} onRetry={onSaveNow} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {ai && <HeaderAction label={ai.label} hint={ai.hint} icon={ai.icon} onClick={onAi} />}
        <HeaderAction label="Audit sheet" hint="AGENTS.md verification sheet" icon={<ShieldCheck />} onClick={onAudit} />
        <HeaderAction label="Print preview" hint="Open the A4 print layout" icon={<Printer />} href={printHref} />
        {onToggleFocus && (
          <IconButton label={focusMode ? 'Show the note' : 'Focus on the report'} shortcut="F" onClick={onToggleFocus} className="max-lg:hidden">
            {focusMode ? <Columns2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </IconButton>
        )}

        <Menu>
          <Tooltip content="More actions">
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <Ellipsis className="h-[18px] w-[18px]" />
              </Button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent>
            {ai && (
              <MenuItem icon={ai.icon} onSelect={onAi} className="sm:hidden">
                {ai.label}
              </MenuItem>
            )}
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
            <MenuItem icon={<Printer />} onSelect={() => window.open(printHref, '_blank', 'noopener')}>
              Open print preview
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
          </MenuContent>
        </Menu>

        {canApprove ? approve : <Tooltip content={approveHint}><span className="max-sm:hidden">{approve}</span></Tooltip>}
      </div>
    </header>
  );
}

/** Labelled from 1536px; icon with tooltip below that, so the bar never wraps. */
function HeaderAction({ label, hint, icon, onClick, href }: { label: string; hint: string; icon: ReactNode; onClick?: () => void; href?: string }) {
  const iconClass = '[&_svg]:h-[18px] [&_svg]:w-[18px]';
  if (href) {
    return (
      <Tooltip content={hint}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className={cn(
            'touch-target inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md text-base font-medium text-ink-2 transition-colors duration-fast hover:bg-surface-3 hover:text-ink max-sm:hidden',
            'w-9 2xl:w-auto 2xl:px-3',
            iconClass,
          )}
        >
          {icon}
          <span className="hidden 2xl:inline">{label}</span>
        </a>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={hint}>
      <Button variant="ghost" onClick={onClick} aria-label={label} className={cn('w-9 px-0 max-sm:hidden 2xl:w-auto 2xl:px-3', iconClass)}>
        {icon}
        <span className="hidden 2xl:inline">{label}</span>
      </Button>
    </Tooltip>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'idle') return null;
  if (state === 'error') {
    return (
      <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-danger hover:bg-danger-soft">
        <CloudOff className="h-3.5 w-3.5" />
        Not saved · Retry
      </button>
    );
  }
  const content = {
    dirty: { icon: <span className="mx-1 h-1.5 w-1.5 rounded-full bg-warning" />, text: 'Unsaved' },
    saving: { icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />, text: 'Saving…' },
    saved: { icon: <Check className="h-3.5 w-3.5 text-success motion-safe:animate-check-pop" />, text: 'Saved' },
  }[state];
  return (
    <span role="status" aria-live="polite" className="hidden shrink-0 items-center gap-1 text-sm text-muted md:inline-flex">
      {content.icon}
      {content.text}
    </span>
  );
}
