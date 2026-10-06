import { useCallback, useEffect, useMemo, useState } from 'react';
import { viewTransition } from '../../lib/motion';

export type ThemePref = 'system' | 'light' | 'dark';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPref(): ThemePref {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

const resolve = (pref: ThemePref, systemDark: boolean) => (pref === 'system' ? (systemDark ? 'dark' : 'light') : pref);

/** Theme preference (system / light / dark), persisted per viewer; the inline script in index.astro applies it before paint. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  useEffect(() => {
    const mq = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = resolve(pref, systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    // Browser chrome follows the in-app theme (the surface colour of the top bars), not the OS.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.removeAttribute('media');
      meta.setAttribute('content', resolved === 'dark' ? '#101622' : '#FFFFFF');
    }
  }, [resolved]);

  const choose = useCallback(
    (next: ThemePref) => {
      try {
        localStorage.setItem('theme', next);
      } catch {}
      // The circular reveal spreads from the switch that was pressed (it holds focus after the click);
      // without one (Safari does not focus clicked buttons) the CSS falls back to the bottom-left corner.
      const root = document.documentElement;
      const from = document.activeElement !== document.body ? document.activeElement?.getBoundingClientRect() : undefined;
      if (from) {
        root.style.setProperty('--reveal-x', `${from.left + from.width / 2}px`);
        root.style.setProperty('--reveal-y', `${from.top + from.height / 2}px`);
      } else {
        root.style.removeProperty('--reveal-x');
        root.style.removeProperty('--reveal-y');
      }
      viewTransition('theme', () => {
        setPref(next);
        document.documentElement.classList.toggle('dark', resolve(next, systemDark) === 'dark');
      });
    },
    [systemDark],
  );

  return useMemo(() => ({ pref, resolved, choose }), [pref, resolved, choose]);
}

export type ThemeApi = ReturnType<typeof useTheme>;
