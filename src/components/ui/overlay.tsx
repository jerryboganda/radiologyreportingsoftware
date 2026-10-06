import type { ComponentProps, ReactNode } from 'react';
import { Dialog as D, DropdownMenu as M, Tooltip as T } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button, Kbd, type ButtonProps } from './button';

/* ---------- Tooltip ---------- */

// Floating surfaces grow out of their trigger and drift in from the side they open on.
// Under reduced motion the global contract (global.css) leaves only the fades.

/** Menus and popovers: 160ms in, 120ms out, from the trigger's corner (pair with an origin-[var(--radix-…-transform-origin)] class). */
export const FLOAT_MOTION =
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-[160ms] data-[state=open]:ease-out data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-[120ms] data-[state=closed]:ease-in data-[state=closed]:pointer-events-none';

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  shortcut,
  side = 'bottom',
  children,
}: {
  content: ReactNode;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            // Smoked glass; the ring keeps it visible over the near-black light box (and the dark canvas).
            'z-[60] flex max-w-[min(20rem,var(--radix-tooltip-content-available-width))] items-center gap-2 rounded-md glass-ink px-2 py-1 text-xs font-medium text-canvas shadow-md ring-1 ring-inset ring-white/10 dark:ring-black/10',
            // Blooms from the trigger after the delay; appears at once when skimming between triggers.
            'origin-[var(--radix-tooltip-content-transform-origin)]',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=delayed-open]:duration-[140ms] data-[state=delayed-open]:ease-out',
            'data-[side=bottom]:slide-in-from-top-0.5 data-[side=top]:slide-in-from-bottom-0.5 data-[side=left]:slide-in-from-right-0.5 data-[side=right]:slide-in-from-left-0.5',
            'data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:duration-75',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-75 data-[state=closed]:pointer-events-none',
          )}
        >
          {content}
          {shortcut && <Kbd className="h-4 border-white/20 bg-white/10 text-canvas/80 dark:border-black/20 dark:bg-black/10">{shortcut}</Kbd>}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  /** Accessible name and tooltip text. */
  label: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'icon' | 'icon-sm';
}

/** Icon-only button: always named for assistive tech and explained on hover. */
export function IconButton({ label, shortcut, side = 'bottom', variant = 'ghost', size = 'icon', children, ...props }: IconButtonProps) {
  return (
    <Tooltip content={label} shortcut={shortcut} side={side}>
      {/* The tooltip repeats the name, so it is not announced a second time as the description. */}
      <Button variant={variant} size={size} aria-label={label} aria-describedby={undefined} aria-keyshortcuts={shortcut} {...props}>
        {children}
      </Button>
    </Tooltip>
  );
}

/* ---------- Dialog ---------- */

export const Dialog = D.Root;
export const DialogClose = D.Close;

// Phones always get the full-width bottom sheet.
const DIALOG_SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' } as const;

// The scrim dims and softly blurs the workspace; only its opacity animates, never the blur radius.
// While it is open, global.css pauses every animation in [data-workspace].
const overlayClass =
  'scrim fixed inset-0 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-exit data-[state=closed]:pointer-events-none';

/** Cobalt-washed header shared by dialogs and the audit panel. */
const headerClass = 'flex items-start gap-3 border-b border-line/70 bg-gradient-to-b from-accent-soft/40 to-transparent px-5 py-4';

/** Footers wrap instead of clipping; on phones the actions stack full width with the commit on top, clear of the home indicator. */
const footerClass =
  'flex flex-col-reverse gap-2 border-t border-line/70 bg-surface-2/70 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:pb-3 max-sm:[&>*]:w-full';

interface DialogContentProps extends Omit<ComponentProps<typeof D.Content>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Optional element shown before the title (status badge, icon). */
  leading?: ReactNode;
  size?: keyof typeof DIALOG_SIZES;
  footer?: ReactNode;
}

/**
 * Dialog: focus-trapped, Esc/overlay to close. A frosted panel over the scrim, which already blurs (never a second blur).
 * Centred from sm (rises 8px and grows from 95%: 240ms in, 150ms out), a bottom sheet on phones.
 * The overlay carries the fade, so the content only moves (no double fade).
 */
export function DialogContent({ title, description, leading, size = 'md', footer, className, children, ...props }: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className={cn(overlayClass, 'grid items-end overflow-y-auto pt-4 sm:p-6 sm:[place-items:safe_center]')}>
        <D.Content
          className={cn(
            'relative flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-xl border-t border-line/70 glass-panel shadow-lg outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl sm:border',
            // Under reduced motion the animation still runs without movement, so the content leaves with the overlay's fade.
            'origin-center data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-out data-[state=closed]:animate-out data-[state=closed]:duration-exit data-[state=closed]:ease-in sm:data-[state=open]:duration-[240ms]',
            'motion-safe:max-sm:data-[state=open]:slide-in-from-bottom motion-safe:max-sm:data-[state=closed]:slide-out-to-bottom',
            'motion-safe:sm:data-[state=open]:zoom-in-95 motion-safe:sm:data-[state=open]:slide-in-from-bottom-2 motion-safe:sm:data-[state=closed]:zoom-out-[0.98]',
            DIALOG_SIZES[size],
            className,
          )}
          {...props}
        >
          <header className={headerClass}>
            {leading}
            <div className="min-w-0 flex-1">
              <D.Title className="text-lg font-semibold tracking-[-0.015em] text-ink">{title}</D.Title>
              {description && <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description>}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-1">
                <X className="h-4 w-4" />
              </Button>
            </D.Close>
          </header>
          <div className={cn('min-h-0 flex-1 overflow-y-auto', !footer && 'max-sm:pb-[env(safe-area-inset-bottom)]')}>{children}</div>
          {footer && <footer className={footerClass}>{footer}</footer>}
        </D.Content>
      </D.Overlay>
    </D.Portal>
  );
}

/** Replaces window.confirm(): restates the consequence; Cancel holds initial focus. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title={title}
        footer={
          <>
            <DialogClose asChild>
              <Button autoFocus>Cancel</Button>
            </DialogClose>
            <Button variant="primary" loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {/* The consequence is the dialog's description, read once after the title. */}
        <D.Description asChild>
          <div className="px-5 py-4 text-base leading-relaxed text-ink-2">{description}</div>
        </D.Description>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Solid, never glass (it sits over the scrolling report), with the edge rim and the washed header; docks with a 32px slide.
 * Non-modal side panel docked over the report pane, so the source note stays visible and zoomable
 * while the panel is open (use with <Dialog modal={false}>). Closes with Esc or its close button.
 * From lg it starts below the 56px case header, so Approve & download stays visible and clickable.
 */
export function PanelContent({ title, description, leading, footer, children }: { title: ReactNode; description?: ReactNode; leading?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <D.Portal>
      <D.Content
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          'fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col border-l border-line/70 bg-surface pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] shadow-lg outline-none sm:w-[min(38rem,58vw)] lg:top-14 lg:pt-0',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-8 data-[state=open]:duration-panel data-[state=open]:ease-out',
          // A closing panel never takes the clicks meant for the report under it.
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-8 data-[state=closed]:duration-[180ms] data-[state=closed]:ease-in data-[state=closed]:pointer-events-none',
        )}
      >
        <header className={headerClass}>
          {leading}
          <div className="min-w-0 flex-1">
            <D.Title className="text-lg font-semibold tracking-[-0.015em] text-ink">{title}</D.Title>
            {description && <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description>}
          </div>
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-1">
              <X className="h-4 w-4" />
            </Button>
          </D.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className={footerClass}>{footer}</footer>}
      </D.Content>
    </D.Portal>
  );
}

/** Side drawer (the case queue on tablets and phones): a frosted panel over the scrim, sliding in from its edge. */
export function SheetContent({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className={overlayClass} />
      <D.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,22rem)] flex-col border-r border-line/70 glass-panel pl-[env(safe-area-inset-left)] shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-out motion-safe:data-[state=open]:slide-in-from-left motion-reduce:data-[state=open]:fade-in-0',
          'data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-safe:data-[state=closed]:slide-out-to-left motion-reduce:data-[state=closed]:fade-out-0 data-[state=closed]:pointer-events-none',
          className,
        )}
      >
        <D.Title className="sr-only">{label}</D.Title>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/* ---------- Menu ---------- */

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          // Capped to the room left, so a long menu scrolls on a landscape phone instead of running off-screen.
          'z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 overflow-y-auto rounded-lg border border-line/70 glass-float p-1 shadow-lg',
          'origin-[var(--radix-dropdown-menu-content-transform-origin)]',
          FLOAT_MOTION,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({ icon, children, shortcut, className, ...props }: ComponentProps<typeof M.Item> & { icon?: ReactNode; shortcut?: string }) {
  return (
    <M.Item
      aria-keyshortcuts={shortcut}
      {...props}
      // 44px on touch; the shortcut hint means nothing without a keyboard.
      className={cn(
        'flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-base text-ink-2 outline-none transition-colors duration-fast coarse:h-11',
        'data-[highlighted]:bg-surface-3/80 data-[highlighted]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-muted',
        className,
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <Kbd className="coarse:hidden">{shortcut}</Kbd>}
    </M.Item>
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;
