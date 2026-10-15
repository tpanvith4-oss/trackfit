import { useState } from 'react';
import { getTheme, setTheme } from '../theme.js';
import { MoonIcon, SunIcon } from './icons.jsx';

export function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const isLight = theme === 'light';

  const toggle = () => {
    const next = isLight ? 'dark' : 'light';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Light theme"
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={toggle}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-slate-800 bg-slate-800/80 p-0.5 transition-colors hover:border-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span
        aria-hidden
        className={`flex size-6 items-center justify-center rounded-full bg-slate-900 shadow transition-transform duration-200 ${
          isLight ? 'translate-x-6 text-amber-400' : 'text-slate-200'
        }`}
      >
        {isLight ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      </span>
    </button>
  );
}
