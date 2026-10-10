const controlClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 ' +
  'outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 ' +
  'aria-invalid:border-rose-500/70 aria-invalid:focus:ring-rose-500/30';

export const fieldErrorId = (htmlFor) => `${htmlFor}-error`;

export function Field({ label, htmlFor, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
      {error ? (
        <p id={fieldErrorId(htmlFor)} className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={controlClass} {...props}>
      {children}
    </select>
  );
}
