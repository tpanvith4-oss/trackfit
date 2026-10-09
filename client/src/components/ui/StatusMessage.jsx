export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2.5 text-sm text-rose-200">
      <span>{error.message ?? String(error)}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold text-rose-100 underline-offset-2 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="h-14 animate-pulse rounded-xl bg-slate-800/60" />
      ))}
    </ul>
  );
}
