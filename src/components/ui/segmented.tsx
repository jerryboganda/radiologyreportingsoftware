import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { spring } from '../../lib/motion';
import { Tooltip } from './overlay';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Show only the icon (label becomes the accessible name and the tooltip). */
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
      className={cn('inline-flex items-center gap-0.5 rounded-lg p-0.5', dark ? 'bg-white/[0.06] ring-1 ring-inset ring-white/10' : 'bg-surface-3/75 ring-1 ring-inset ring-line/50', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        const button = (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={o.iconOnly ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              // Inset focus ring: the neighbouring pill would otherwise paint over an outset one.
              'relative isolate inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium focus-visible:outline-offset-[-2px] coarse:h-9',
              // Sinks on press and springs back (.press); its own colour transition comes with it.
              'press [--press:0.97] [&_svg]:h-3.5 [&_svg]:w-3.5',
              active ? (dark ? 'text-white' : 'text-ink') : dark ? 'text-slate-400 hover:text-slate-100' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${id}`}
                layoutDependency={value}
                className={cn(
                  'absolute inset-0 -z-10 rounded-md forced-colors:outline forced-colors:outline-2 forced-colors:outline-[Highlight]',
                  dark ? 'bg-white/[0.13]' : 'bg-surface shadow-xs',
                )}
                transition={spring.layout}
              />
            )}
            {o.icon}
            {!o.iconOnly && <span>{o.label}</span>}
            {o.count !== undefined && <span className="font-normal tabular-nums text-muted">{o.count}</span>}
          </button>
        );
        return o.iconOnly ? (
          <Tooltip key={o.value} content={o.label} side="top">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
