import { useEffect, useState } from 'react';
import { CheckIcon } from '../../components/icons.jsx';
import { loadWakeChecklist, saveWakeChecklist, subscribeWakeChecklist, WAKE_CHECKLIST_ITEMS } from './wakeChecklistStore.js';

export function WakeChecklist({ userId }) {
  const [checked, setChecked] = useState(() => loadWakeChecklist(userId));

  useEffect(
    () => subscribeWakeChecklist((changedUserId, next) => changedUserId === userId && setChecked(next)),
    [userId],
  );

  const toggle = (itemId) => saveWakeChecklist(userId, { ...checked, [itemId]: !checked[itemId] });

  return (
    <ul className="space-y-2">
      {WAKE_CHECKLIST_ITEMS.map(({ id, label, hint }) => {
        const isChecked = Boolean(checked[id]);
        return (
          <li key={id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                isChecked ? 'border-brand-500/40 bg-brand-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <input type="checkbox" checked={isChecked} onChange={() => toggle(id)} className="peer sr-only" />
              <span
                aria-hidden
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/50 ${
                  isChecked ? 'border-brand-500 bg-brand-500 text-slate-950' : 'border-slate-600'
                }`}
              >
                {isChecked && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
              <span>
                <span className={`block text-sm font-medium ${isChecked ? 'text-slate-300 line-through decoration-slate-500' : 'text-slate-100'}`}>
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
