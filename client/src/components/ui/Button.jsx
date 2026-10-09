const variants = {
  primary: 'bg-brand-500 text-slate-950 hover:bg-brand-400 active:bg-brand-600 font-semibold',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 active:bg-slate-700',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
