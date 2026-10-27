import { shortTemplateLabel } from '../../constants/cutProtocol.js';

export function BlueprintMealBar({ templates = [], disabled, onSelect }) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">1-tap blueprint meals</p>
      <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
        <ul className="flex w-max gap-2 pb-1" aria-label="Blueprint meal templates">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(template)}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left transition hover:border-brand-500/50 hover:bg-brand-500/10 disabled:opacity-50"
              >
                <span className="block whitespace-nowrap text-sm font-semibold text-slate-100">{shortTemplateLabel(template.name)}</span>
                <span className="block whitespace-nowrap text-[11px] tabular-nums text-slate-400">
                  {template.calories} kcal · {template.proteinG}g P
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
