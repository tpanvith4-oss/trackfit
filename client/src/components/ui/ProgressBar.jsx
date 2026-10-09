const tones = {
  brand: 'bg-brand-500',
  sky: 'bg-sky-400',
  rose: 'bg-rose-500',
};

export function ProgressBar({ value, max, label, tone = 'brand', className = '' }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={`h-2 overflow-hidden rounded-full bg-slate-800 ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${tones[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
