import type { ComponentType } from 'react';
import { Archive, BadgeCheck, LoaderCircle, MessageCircleQuestion, PenLine, TriangleAlert } from 'lucide-react';
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
export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  QUEUED: { label: 'Queued', description: 'Waiting for the AI engine', chip: 'bg-accent-soft text-accent' },
  PROCESSING: { label: 'Generating', description: 'Gemini is reading the note', chip: 'bg-accent-soft text-accent', icon: LoaderCircle },
  DRAFT: { label: 'Draft', description: 'Ready for your review', chip: 'bg-surface-3 text-ink-2', icon: PenLine },
  BLOCKED: { label: 'Blocked', description: 'The AI needs a clarification', chip: 'bg-warning-soft text-warning', icon: MessageCircleQuestion },
  FAILED: { label: 'Failed', description: 'Generation failed', chip: 'bg-danger-soft text-danger', icon: TriangleAlert },
  FINALIZED: { label: 'Finalized', description: 'Issued as PDF', chip: 'bg-success-soft text-success', icon: BadgeCheck },
};

// A draft whose wording contains terms the senior never wrote reads "Check wording" until the resident confirms or fixes it.
const WORDING_META: StatusMeta = { label: 'Check wording', description: 'Contains terms that are not in the senior’s note', chip: 'bg-warning-soft text-warning', icon: TriangleAlert };

export function StatusChip({ status, archived, flagged, className }: { status: ReportStatus; archived?: boolean | null; flagged?: boolean; className?: string }) {
  if (archived) {
    return (
      <span className={cn('inline-flex h-6 items-center gap-1 rounded-full bg-surface-3 px-2 text-xs font-medium text-muted', className)}>
        <Archive className="h-3.5 w-3.5" aria-hidden />
        Archived
      </span>
    );
  }
  const meta = status === 'DRAFT' && flagged ? WORDING_META : (STATUS_META[status] ?? STATUS_META.DRAFT);
  const Icon = meta.icon;
  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium transition-colors duration-base',
        meta.chip,
        className,
      )}
    >
      {status === 'QUEUED' ? (
        <span className="relative mx-0.5 flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-current motion-safe:animate-soft-pulse" />
        </span>
      ) : (
        Icon && <Icon className={cn('h-3.5 w-3.5', status === 'PROCESSING' && 'motion-safe:animate-spin')} aria-hidden />
      )}
      {meta.label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}
