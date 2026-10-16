// CSS variables keep chart chrome in step with the light/dark theme.
export const AXIS_TICK = { fill: 'var(--color-slate-500)', fontSize: 11 };
export const GRID_STROKE = 'var(--color-slate-800)';

export const TOOLTIP_CLASS =
  'rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 shadow-lg shadow-black/30';

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const formatInt = (value) => Math.round(toNumber(value)).toLocaleString();
