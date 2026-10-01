import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

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
  }, [resolved]);

  const choose = (next: ThemePref) => {
    try {
      localStorage.setItem('theme', next);
    } catch {}
    const apply = () => {
      flushSync(() => setPref(next));
      document.documentElement.classList.toggle('dark', resolve(next, systemDark) === 'dark');
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(apply);
    else apply();
  };

  return { pref, resolved, choose };
}

export type ThemeApi = ReturnType<typeof useTheme>;
