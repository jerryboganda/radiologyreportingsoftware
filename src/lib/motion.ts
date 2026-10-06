import { flushSync } from 'react-dom';
import type { Transition } from 'motion/react';

/** The one motion vocabulary for motion/react; the CSS side lives in global.css (--ease-*) and tailwind.config.mjs. */
export const ease = { out: [0.16, 1, 0.3, 1], in: [0.4, 0, 1, 1] } as const;

/** layout: anything that changes place (no bounce). pop: things pressed or popping in (~16% overshoot, settled by 320ms). */
export const spring = {
  layout: { type: 'spring', bounce: 0, duration: 0.3 },
  pop: { type: 'spring', stiffness: 784, damping: 28, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Overdamped follow for pointer-driven values (useSpring). */
export const drift = { stiffness: 120, damping: 20, mass: 0.6 } as const;

export const tween = {
  enter: { duration: 0.22, ease: ease.out },
  exit: { duration: 0.15, ease: ease.in },
} as const satisfies Record<string, Transition>;

/** The single gate for imperative motion (smooth scrolls, View Transitions). */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let current: ViewTransition | null = null;

/**
 * Runs a state change as a View Transition when supported and motion is allowed; otherwise applies it at once.
 * html[data-vt] keys the CSS (global.css): 'layout' names the queue, panes and header clusters; 'theme' is the
 * circular reveal. A transition started mid-way skips the previous one, whose cleanup must not strip the new one's key.
 */
export function viewTransition(kind: 'layout' | 'theme', update: () => void) {
  if (!document.startViewTransition || prefersReducedMotion()) return update();
  const root = document.documentElement;
  root.dataset.vt = kind;
  const vt = document.startViewTransition(() => flushSync(update));
  current = vt;
  vt.finished.finally(() => {
    if (current !== vt) return;
    current = null;
    delete root.dataset.vt;
  });
}
