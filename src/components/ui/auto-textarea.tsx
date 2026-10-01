import { useLayoutEffect, useRef, type ComponentProps, type RefObject } from 'react';
import { cn } from '../../lib/cn';

const nativeAutoSize = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');

/** Textarea that grows with its content: CSS `field-sizing` where supported, a height sync otherwise. */
export function AutoTextarea({ className, value, ref: outerRef, ...props }: ComponentProps<'textarea'>) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = inner.current;
    if (nativeAutoSize || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        inner.current = el;
        if (typeof outerRef === 'function') outerRef(el);
        else if (outerRef) (outerRef as RefObject<HTMLTextAreaElement | null>).current = el;
      }}
      rows={1}
      value={value}
      className={cn('field-auto block w-full overflow-hidden', className)}
      {...props}
    />
  );
}
