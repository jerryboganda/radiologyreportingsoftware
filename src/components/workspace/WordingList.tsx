import { useState } from 'react';
import { cn } from '../../lib/cn';
import type { WordingFlag, WordingKind } from '../../lib/wording';

const KIND_LABEL: Record<WordingKind, string> = {
  diagnosis: 'diagnosis',
  finding: 'finding',
  hedge: 'certainty word',
  cause: 'cause',
  severity: 'severity',
  advice: 'AI’s own advice',
  number: 'number',
};

/** The flagged terms, each with where it sits and the sentence around it. Used by the banner, the audit panel and the approve dialog. */
export function WordingList({ flags, limit = 8, onSelect, className }: { flags: WordingFlag[]; limit?: number; onSelect?: (flag: WordingFlag) => void; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? flags : flags.slice(0, limit);
  return (
    <ul className={cn('space-y-1', className)}>
      {shown.map((f) => {
        const row = (
          <>
            <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 text-sm font-semibold text-warning">{f.term}</span>
            {/* Free-text structure names can be long: this part wraps rather than pushing the row wider. */}
            <span className="min-w-0 break-words text-sm text-muted">
              {f.where} · {KIND_LABEL[f.kind]}
            </span>
            <span className="line-clamp-2 basis-full font-document text-sm leading-snug text-ink-2">
              {f.before}
              <mark className="rounded-sm bg-warning/25 px-0.5 font-semibold text-ink">{f.match}</mark>
              {f.after}
            </span>
          </>
        );
        return (
          <li key={`${f.key}|${f.term}`}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(f)} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-1.5 py-1 text-left transition-colors duration-fast hover:bg-warning/10">
                {row}
              </button>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1.5 py-1">{row}</div>
            )}
          </li>
        );
      })}
      {flags.length > limit && (
        <li>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="touch-target rounded-md px-1.5 py-0.5 text-sm font-medium text-muted transition-colors duration-fast hover:bg-warning/10 hover:text-ink"
          >
            {expanded ? 'Show fewer' : `Show all ${flags.length} (${flags.length - limit} more)`}
          </button>
        </li>
      )}
    </ul>
  );
}
