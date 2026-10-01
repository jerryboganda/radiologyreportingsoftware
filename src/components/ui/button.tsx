import type { ComponentProps, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'onDark';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-accent shadow-sm hover:bg-brand/90 active:bg-brand/85',
  secondary:
    'border border-line-strong/80 bg-surface text-ink-2 shadow-xs hover:border-line-strong hover:bg-surface-2 hover:text-ink',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  subtle: 'bg-surface-3 text-ink-2 hover:bg-line hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger/90',
  // Controls that sit on the always-dark light box.
  onDark: 'text-slate-300 hover:bg-white/10 hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-sm',
  md: 'h-9 gap-2 rounded-md px-3.5 text-base',
  lg: 'h-11 gap-2 rounded-lg px-5 text-md',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-md',
};

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks clicks; the label stays so the button never changes width. */
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  const iconOnly = size === 'icon' || size === 'icon-sm';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'touch-target inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-fast ease-standard',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className={cn('animate-spin', iconOnly ? 'h-4 w-4' : 'h-4 w-4 -ml-0.5')} aria-hidden />}
      {!(loading && iconOnly) && children}
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
