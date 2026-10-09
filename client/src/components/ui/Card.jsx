export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
