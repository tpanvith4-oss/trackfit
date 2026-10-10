import { useId } from 'react';

export function Switch({ checked, onChange, label, description, disabled = false }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium text-slate-100">
          {label}
        </p>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 text-xs text-slate-400">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 ${
          checked ? 'bg-brand-500' : 'bg-slate-700'
        }`}
      >
        <span
          aria-hidden
          className={`size-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}
