import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Show only the icon (label becomes the accessible name). */
  iconOnly?: boolean;
  count?: number;
}

/** Small exclusive switch with a sliding selection pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  tone = 'default',
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  tone?: 'default' | 'dark';
  className?: string;
}) {
  const id = useId();
  const dark = tone === 'dark';
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-lg p-0.5', dark ? 'bg-white/[0.06] ring-1 ring-inset ring-white/10' : 'bg-surface-3', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={o.iconOnly ? o.label : undefined}
            title={o.iconOnly ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative isolate inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium [@media(pointer:coarse)]:h-9',
              'transition-colors duration-fast ease-standard [&_svg]:h-3.5 [&_svg]:w-3.5',
              active ? (dark ? 'text-white' : 'text-ink') : dark ? 'text-slate-400 hover:text-slate-100' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${id}`}
                className={cn('absolute inset-0 -z-10 rounded-md', dark ? 'bg-white/[0.13]' : 'bg-surface shadow-xs')}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            )}
            {o.icon}
            {!o.iconOnly && <span>{o.label}</span>}
            {o.count !== undefined && <span className={cn('tabular-nums', active ? 'text-muted' : 'text-faint')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
