import { useEffect, useId, useRef, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import { ChevronDownIcon, SparklesIcon, SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { formatNumber } from '../../utils/number.js';

const MIN_DESCRIPTION = 2;
const MAX_DESCRIPTION = 500;

const localTimeNow = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

function ItemChip({ item }) {
  return (
    <li className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-slate-100">{item.name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">
          {formatNumber(item.calories)} <span className="text-xs font-normal text-slate-500">kcal</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-slate-400">
        <span className="min-w-0 truncate">{item.quantity || 'Typical serving'}</span>
        <span className="shrink-0">
          P {item.protein}g · C {item.carbs}g · F {item.fat}g
        </span>
      </div>
    </li>
  );
}

function EstimateBreakdown({ estimate, panelId }) {
  const [expanded, setExpanded] = useState(true);
  const count = estimate.items.length;

  return (
    <div className="rounded-xl border border-brand-500/25 bg-brand-500/5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-brand-300">{estimate.mealTitle}</span>
          <span className="block text-[11px] text-slate-400">
            {count} {count === 1 ? 'item' : 'items'} · {formatNumber(estimate.totalCalories)} kcal · filled in below, edit anything
          </span>
        </span>
        <ChevronDownIcon className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <ul id={panelId} className="space-y-1.5 px-3 pb-3" aria-label="Estimated items">
          {estimate.items.map((item, index) => (
            <ItemChip key={`${index}-${item.name}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Free-text meal entry: Gemini turns "rice 200 g, sambar and 4 eggs" into totals that
 * `onEstimate` copies into the meal form, plus an itemised breakdown to check portions against.
 */
export function AiMealLogger({ onEstimate, disabled = false }) {
  const id = useId();
  const [description, setDescription] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleEstimate = async (event) => {
    event.preventDefault();
    const text = description.trim();
    if (text.length < MIN_DESCRIPTION) {
      setError(new Error('Describe what you ate, e.g. "2 rotis with dal and curd".'));
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsEstimating(true);
    setError(null);
    try {
      const result = await foodApi.aiParse({ description: text, localTime: localTimeNow() }, { signal: controller.signal });
      setEstimate(result);
      onEstimate(result);
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      if (controllerRef.current === controller) setIsEstimating(false);
    }
  };

  const busy = disabled || isEstimating;

  return (
    <form onSubmit={handleEstimate} className="space-y-2" aria-busy={isEstimating}>
      <label htmlFor={`${id}-describe`} className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <SparklesIcon className="size-3.5 text-brand-400" />
        Describe your meal
      </label>
      <div className="flex gap-2">
        <Input
          id={`${id}-describe`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError(null);
          }}
          placeholder="e.g. rice 200 g, sambar and 4 eggs"
          maxLength={MAX_DESCRIPTION}
          autoComplete="off"
          enterKeyHint="go"
          disabled={busy}
          className="min-w-0"
        />
        <Button type="submit" className="shrink-0 px-3.5" disabled={busy}>
          {isEstimating ? <SpinnerIcon className="size-4" /> : <SparklesIcon className="size-4" />}
          Estimate
        </Button>
      </div>

      {isEstimating && (
        <p role="status" className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <SpinnerIcon className="size-3.5 text-brand-400" />
          Analyzing nutritional data...
        </p>
      )}
      <ErrorMessage error={error} />
      {estimate && !isEstimating && <EstimateBreakdown key={estimate.mealTitle + estimate.totalCalories} estimate={estimate} panelId={`${id}-items`} />}
    </form>
  );
}
