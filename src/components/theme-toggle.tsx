'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';
const STORAGE_KEY = 'theme';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Light/Dark/Auto selector, stored in localStorage (a per-device display
 * preference, not account data). The <head> script in the root layout reads
 * the same key synchronously before paint, so there's no flash of the wrong
 * theme on load -- this component only needs to handle changes after that.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') setTheme(stored);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'auto') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
      <div
        role="group"
        aria-label="Theme"
        className="inline-flex rounded-full border border-slate-300 p-1 dark:border-slate-700"
      >
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={theme === opt.value}
            onClick={() => choose(opt.value)}
            className={`min-h-touch rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              theme === opt.value
                ? 'bg-brand-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
