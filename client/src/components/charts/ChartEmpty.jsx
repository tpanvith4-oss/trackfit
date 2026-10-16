export function ChartEmpty({ children, className = 'h-48' }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-dashed border-slate-800 px-4 text-center text-sm text-slate-500 ${className}`}>
      {children}
    </div>
  );
}
