import { useId } from 'react';
import { getDayLabel, shiftDayKey, todayKey } from '../../hooks/useSelectedDate.js';
import { ChevronDownIcon } from '../icons.jsx';

const CalendarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const navButton =
  'flex size-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

/** Day picker for backdating: previous/next day plus a native date input. Controlled via `selectedDate`. */
export function DateNavigator({ selectedDate, onDateChange }) {
  const id = useId();
  const today = todayKey();
  const isToday = selectedDate >= today;
  const go = (key) => key <= today && onDateChange(key);

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-1.5">
      <button type="button" className={navButton} onClick={() => go(shiftDayKey(selectedDate, -1))} aria-label="Previous day">
        <ChevronDownIcon className="size-5 rotate-90" />
      </button>

      <label
        htmlFor={`${id}-date`}
        className="relative flex min-w-0 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-slate-800"
      >
        <CalendarIcon className="size-4 shrink-0 text-brand-400" />
        <span className="truncate text-sm font-semibold text-slate-100" aria-live="polite">
          {getDayLabel(selectedDate)}
        </span>
        <input
          id={`${id}-date`}
          type="date"
          max={today}
          value={selectedDate}
          onChange={(event) => event.target.value && go(event.target.value)}
          aria-label="Choose date"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      <button type="button" className={navButton} onClick={() => go(shiftDayKey(selectedDate, 1))} disabled={isToday} aria-label="Next day">
        <ChevronDownIcon className="size-5 -rotate-90" />
      </button>
    </div>
  );
}
