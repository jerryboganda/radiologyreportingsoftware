import { useState, type ComponentType } from 'react';
import { Archive, BadgeCheck, LoaderCircle, MessageCircleQuestion, PenLine, SpellCheck, TriangleAlert } from 'lucide-react';
import type { ReportStatus } from '../../lib/report';
import { cn } from '../../lib/cn';

interface StatusMeta {
  label: string;
  /** Longer phrase for banners and screen readers. */
  description: string;
  chip: string;
  icon?: ComponentType<{ className?: string }>;
}

// One colour per state everywhere; red is reserved for failure (and the urgent box).
// Glossy pills: the soft fill plus a same-hue inset ring (and the edge light from StatusChip).
export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  QUEUED: { label: 'Queued', description: 'Waiting for the AI engine', chip: 'bg-accent-soft text-accent ring-accent/20' },
  PROCESSING: { label: 'Generating', description: 'The AI is reading the note', chip: 'bg-accent-soft text-accent ring-accent/20', icon: LoaderCircle },
  DRAFT: { label: 'Draft', description: 'Ready for your review', chip: 'bg-surface-3 text-ink-2 ring-line-strong/70', icon: PenLine },
  BLOCKED: { label: 'Blocked', description: 'The AI needs a clarification', chip: 'bg-warning-soft text-warning ring-warning/25', icon: MessageCircleQuestion },
  FAILED: { label: 'Failed', description: 'Generation failed', chip: 'bg-danger-soft text-danger ring-danger/25', icon: TriangleAlert },
  FINALIZED: { label: 'Finalized', description: 'Issued as PDF', chip: 'bg-success-soft text-success ring-success/25', icon: BadgeCheck },
};

// A draft whose wording contains terms the senior never wrote reads "Check wording" until the resident confirms or fixes it.
// Its own glyph: the icon must not be the Failed one, for readers who cannot tell amber from red.
const WORDING_META: StatusMeta = { label: 'Check wording', description: 'Contains terms that are not in the senior’s note', chip: 'bg-warning-soft text-warning ring-warning/25', icon: SpellCheck };

/**
 * On a real state change the fill eases to the new colour, the label rises 4px into place and the icon pops.
 * Mounting never animates (first load, list remount, case switch): only a label that differs from the one it mounted with.
 */
export function StatusChip({ status, archived, flagged, className }: { status: ReportStatus; archived?: boolean | null; flagged?: boolean; className?: string }) {
  const meta = status === 'DRAFT' && flagged ? WORDING_META : (STATUS_META[status] ?? STATUS_META.DRAFT);
  const label = archived ? 'Archived' : meta.label;
  const [initial] = useState(label);
  const changed = label !== initial;
  const swap = cn('inline-flex items-center gap-1', changed && 'motion-safe:animate-swap-in');
  const pop = cn('h-3.5 w-3.5', changed && 'motion-safe:animate-pop-in');
  if (archived) {
    return (
      <span className={cn('inline-flex h-6 items-center rounded-full bg-surface-3 px-2 text-xs font-medium text-muted shadow-edge ring-1 ring-inset ring-line/80 [--dir:1]', className)}>
        <span key={label} className={swap}>
          <Archive className={pop} aria-hidden />
          Archived
        </span>
      </span>
    );
  }
  const Icon = meta.icon;
  return (
    <span
      title={meta.description}
      className={cn(
        // The width snaps; [--dir:1] makes the label always rise.
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium shadow-edge ring-1 ring-inset transition-[color,background-color,box-shadow] duration-base [--dir:1]',
        meta.chip,
        className,
      )}
    >
      <span key={label} className={swap}>
        {status === 'QUEUED' ? (
          // The dot sits in an icon-sized slot so labels line up across chips.
          <span className="grid h-3.5 w-3.5 place-items-center" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-soft-pulse" />
          </span>
        ) : (
          Icon && <Icon className={status === 'PROCESSING' ? 'h-3.5 w-3.5 motion-safe:animate-spin' : pop} aria-hidden />
        )}
        {meta.label}
      </span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}
