import { useImperativeHandle, useLayoutEffect, useRef, type ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const nativeAutoSize = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');

/** Border-box height that fits the content (scrollHeight leaves the borders out). */
const fit = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
};

/** Textarea that grows with its content: CSS `field-sizing` where supported, a height sync otherwise. */
export function AutoTextarea({ className, value, ref: outerRef, ...props }: ComponentProps<'textarea'>) {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(outerRef, () => inner.current!, []);

  useLayoutEffect(() => {
    if (!nativeAutoSize && inner.current) fit(inner.current);
  }, [value]);

  // The text rewraps whenever the width changes (split drag, sidebar, container breakpoints), so re-fit then too.
  useLayoutEffect(() => {
    const el = inner.current;
    if (nativeAutoSize || !el) return;
    let width = el.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fit(el));
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <textarea ref={inner} rows={1} value={value} className={cn('field-auto block w-full overflow-hidden', className)} {...props} />;
}
