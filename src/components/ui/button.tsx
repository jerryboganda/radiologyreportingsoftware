import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'onDark';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

/** Lit navy: brand down to brand-lo, white top rim and a cobalt glow; disabled primaries lose the glow. Also for <label>s styled as the primary. */
export const PRIMARY_FILL =
  'bg-brand bg-gradient-to-b from-brand to-brand-lo text-on-accent shadow-primary hover:brightness-[1.08] active:brightness-95 disabled:shadow-none';

// .press (global.css) sinks every button on press and springs it back; .lift raises the solid ones 1px on hover.
const VARIANTS: Record<Variant, string> = {
  primary: `${PRIMARY_FILL} lift`,
  secondary:
    'lift border border-line-strong/80 bg-surface text-ink-2 shadow-xs hover:border-line-strong hover:bg-surface-2 hover:text-ink active:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink active:bg-line/70',
  subtle: 'bg-surface-3 text-ink-2 hover:bg-line hover:text-ink active:bg-line-strong/60',
  // Controls that sit on the always-dark light box.
  onDark: 'text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/15',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-sm',
  md: 'h-9 gap-2 rounded-md px-3.5 text-base',
  lg: 'h-11 gap-2 rounded-lg px-5 text-md',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-md',
};

/** The DESIGN chrome input: 36px (44px and 16px text on touch, so iOS never zooms), surface-2 fill, hover border, cobalt focus ring. */
export const fieldClass =
  'h-9 w-full rounded-md border border-line bg-surface-2 px-3 text-base text-ink transition-[border-color,box-shadow,background-color] duration-fast placeholder:text-muted hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line coarse:h-11 coarse:text-lg';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner in place of the leading icon and blocks clicks; the label stays, so the button never changes width. */
  loading?: boolean;
  /** The one enabled next-step primary: a light runs round its edge (never while disabled or loading). */
  shimmer?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, shimmer, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  const iconOnly = size === 'icon' || size === 'icon-sm';
  let content = children;
  if (loading) {
    const parts = Children.toArray(children);
    // A leading icon is any non-DOM element first child (lucide icons); the spinner takes its slot.
    const leadIcon = iconOnly || (isValidElement(parts[0]) && typeof parts[0].type !== 'string');
    const spinner = <LoaderCircle key="spinner" className={cn('h-4 w-4 motion-safe:animate-spin', !leadIcon && '-ml-0.5')} aria-hidden />;
    content = iconOnly ? spinner : [spinner, ...parts.slice(leadIcon ? 1 : 0)];
  }
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'touch-target press relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium',
        // Busy buttons keep full strength: they are working, not unavailable.
        'disabled:pointer-events-none [&:disabled:not([aria-busy])]:opacity-50 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {shimmer && !disabled && !loading && <span aria-hidden className="shimmer-ring" />}
      {content}
    </button>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong/70 bg-surface-2 px-1 font-sans text-xs font-medium text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
