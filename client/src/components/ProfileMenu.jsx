import { useEffect, useId, useRef, useState } from 'react';
import { getApiStatusStyle } from './apiStatus.js';
import { ChevronDownIcon, LogOutIcon } from './icons.jsx';

function initialsOf(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function ProfileMenu({ user, apiStatus, onLogout }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const status = getApiStatusStyle(apiStatus);
  const firstName = user.name.trim().split(/\s+/)[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 py-1 pr-2.5 pl-1 text-sm text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80"
      >
        <span className="relative flex size-7 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-300 ring-1 ring-brand-500/30">
          {initialsOf(user.name)}
          <span
            className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-slate-900 ${status.dot}`}
            title={`Server: ${status.label}`}
          />
        </span>
        <span className="max-w-[7.5rem] truncate font-medium">{firstName}</span>
        <ChevronDownIcon className={`size-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">, server {status.label}. Open account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-20 mt-2 w-60 origin-top-right rounded-2xl border border-slate-800 bg-slate-900 p-1.5 shadow-xl shadow-black/40 motion-safe:animate-fade-in"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
            <p className="truncate text-xs text-slate-500">@{user.username}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              Server {status.label.toLowerCase()}
            </p>
          </div>
          <div className="my-1 h-px bg-slate-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
          >
            <LogOutIcon className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
