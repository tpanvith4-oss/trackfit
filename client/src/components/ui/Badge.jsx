const tones = {
  brand: 'bg-brand-500/15 text-brand-400 ring-brand-500/25',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
  slate: 'bg-slate-800 text-slate-300 ring-slate-700',
};

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
