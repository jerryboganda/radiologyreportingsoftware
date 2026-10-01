import type { ComponentProps, ReactNode } from 'react';
import { Dialog as D, DropdownMenu as M, Tooltip as T } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button, Kbd, type ButtonProps } from './button';

/* ---------- Tooltip ---------- */

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
            'z-[60] flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-xs font-medium text-canvas shadow-md',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-[0.96]',
            'data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
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
      <Button variant={variant} size={size} aria-label={label} {...props}>
        {children}
      </Button>
    </Tooltip>
  );
}

/* ---------- Dialog ---------- */

export const Dialog = D.Root;
export const DialogClose = D.Close;

const DIALOG_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' } as const;

const overlayClass =
  'fixed inset-0 z-50 bg-[rgb(var(--shadow)/0.45)] dark:bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150';

interface DialogContentProps extends Omit<ComponentProps<typeof D.Content>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Optional element shown before the title (status badge, icon). */
  leading?: ReactNode;
  size?: keyof typeof DIALOG_SIZES;
  footer?: ReactNode;
}

/** Centred dialog: focus-trapped, Esc/overlay to close, fade + gentle scale. */
export function DialogContent({ title, description, leading, size = 'md', footer, className, children, ...props }: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className={cn(overlayClass, 'grid place-items-center overflow-y-auto p-4 sm:p-6')}>
        <D.Content
          className={cn(
            'relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-bottom-1 data-[state=open]:duration-200 data-[state=open]:ease-out',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-150',
            DIALOG_SIZES[size],
            className,
          )}
          {...props}
        >
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            {leading}
            <div className="min-w-0 flex-1">
              <D.Title className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</D.Description>
              )}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-1">
                <X className="h-4 w-4" />
              </Button>
            </D.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</footer>}
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
  tone = 'primary',
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
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
            <Button variant={tone} loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 text-base leading-relaxed text-ink-2">{description}</div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Non-modal side panel docked over the report pane, so the source note stays visible and zoomable
 * while the panel is open (use with <Dialog modal={false}>). Closes with Esc or its close button.
 */
export function PanelContent({ title, description, leading, footer, children }: { title: ReactNode; description?: ReactNode; leading?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <D.Portal>
      <D.Content
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-surface shadow-lg outline-none sm:w-[min(38rem,58vw)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=open]:ease-out',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200',
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          {leading}
          <div className="min-w-0 flex-1">
            <D.Title className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">Side panel</D.Description>}
          </div>
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-1">
              <X className="h-4 w-4" />
            </Button>
          </D.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</footer>}
      </D.Content>
    </D.Portal>
  );
}

/** Side drawer (the case queue on tablets and phones). */
export function SheetContent({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className={overlayClass} />
      <D.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,22rem)] flex-col bg-surface shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-300 data-[state=open]:ease-out',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:duration-200',
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
          'z-50 min-w-52 rounded-lg border border-line bg-surface p-1 shadow-lg',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[side=bottom]:slide-in-from-top-1',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({
  icon,
  children,
  shortcut,
  tone,
  ...props
}: ComponentProps<typeof M.Item> & { icon?: ReactNode; shortcut?: string; tone?: 'danger' }) {
  return (
    <M.Item
      className={cn(
        'flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-base text-ink-2 outline-none',
        'data-[highlighted]:bg-surface-3 data-[highlighted]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-muted',
        tone === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger [&_svg]:text-danger',
      )}
      {...props}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </M.Item>
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;
