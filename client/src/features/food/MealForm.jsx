import { useId, useMemo, useRef, useState } from 'react';
import { foodApi } from '../../api/foodApi.js';
import { SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { checkAtwater } from '../../constants/cutProtocol.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { AiMealLogger } from './AiMealLogger.jsx';
import { MEAL_TYPES, QUICK_STAPLES, mergeMealRecommendations } from './constants.js';
import { getMealTypeByCurrentTime } from './mealTime.js';

const MACRO_FIELDS = [
  { field: 'proteinG', label: 'Protein' },
  { field: 'carbsG', label: 'Carbs' },
  { field: 'fatG', label: 'Fat' },
];

const createInitialForm = () => ({
  name: '',
  mealType: getMealTypeByCurrentTime(),
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
});

const toMacroGrams = (value) => parseFloat(value) || 0;

const AI_MEAL_TYPES = { breakfast: 'BREAKFAST', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK' };
const MAX_CALORIES = 10_000;
const MAX_MACRO_G = 1_000;

function PresetChips({ presets, activePresetId, disabled, onSelect }) {
  if (presets.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
      <ul className="flex w-max snap-x gap-2 pb-1" aria-label="Meal recommendations">
        {presets.map((preset) => {
          const active = preset.id === activePresetId;
          const frequent = preset.source === 'frequent';
          return (
            <li key={preset.id} className="snap-start">
              <button
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onSelect(preset)}
                className={`rounded-xl border px-3 py-2 text-left transition disabled:opacity-50 ${
                  active
                    ? 'border-brand-500 bg-brand-500/15'
                    : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 active:bg-slate-800'
                }`}
              >
                <span className={`block whitespace-nowrap text-sm font-medium ${active ? 'text-brand-400' : 'text-slate-100'}`}>
                  {preset.name}
                </span>
                <span className="block whitespace-nowrap text-[11px] tabular-nums text-slate-400">
                  {preset.calories} kcal · {preset.proteinG}g protein
                  {frequent ? ` · ×${preset.frequency}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MealForm({ onSubmit }) {
  const id = useId();
  const [form, setForm] = useState(createInitialForm);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [aiResetKey, setAiResetKey] = useState(0);
  const submittingRef = useRef(false);
  const { data: frequentMeals, reload: reloadRecommendations } = useAsyncData(
    (signal) => foodApi.recommendations({ limit: 8 }, { signal }),
    [],
  );

  const presets = useMemo(() => mergeMealRecommendations(frequentMeals ?? [], QUICK_STAPLES), [frequentMeals]);
  const atwater = useMemo(
    () =>
      checkAtwater({
        name: form.name,
        calories: form.calories,
        proteinG: form.proteinG,
        carbsG: form.carbsG,
        fatG: form.fatG,
      }),
    [form],
  );

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const applyPreset = (preset) => {
    setForm({
      name: preset.name,
      mealType: preset.mealType,
      calories: String(preset.calories),
      proteinG: String(preset.proteinG ?? 0),
      carbsG: String(preset.carbsG ?? 0),
      fatG: String(preset.fatG ?? 0),
    });
    setActivePresetId(preset.id);
    setError(null);
  };

  const fixMacros = () => {
    setForm((prev) => ({ ...prev, calories: String(atwater.atwaterCalories) }));
    setError(null);
  };

  const applyEstimate = (estimate) => {
    setForm((prev) => ({
      name: estimate.mealTitle.slice(0, 120),
      mealType: AI_MEAL_TYPES[estimate.suggestedMealType] ?? prev.mealType,
      calories: String(Math.min(estimate.totalCalories, MAX_CALORIES)),
      proteinG: String(Math.min(estimate.totalProtein, MAX_MACRO_G)),
      carbsG: String(Math.min(estimate.totalCarbs, MAX_MACRO_G)),
      fatG: String(Math.min(estimate.totalFat, MAX_MACRO_G)),
    }));
    setActivePresetId(null);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const name = form.name.trim();
    const calories = parseInt(form.calories, 10);

    if (!name) {
      setError(new Error('Enter a name for this food.'));
      return;
    }
    if (!Number.isFinite(calories) || calories < 0) {
      setError(new Error('Enter calories as a whole number (0 or more).'));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        mealType: form.mealType,
        calories,
        proteinG: toMacroGrams(form.proteinG),
        carbsG: toMacroGrams(form.carbsG),
        fatG: toMacroGrams(form.fatG),
        forceOverride: atwater.needsFix,
      });
      setForm(createInitialForm());
      setActivePresetId(null);
      setAiResetKey((key) => key + 1);
      reloadRecommendations();
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AiMealLogger key={aiResetKey} onEstimate={applyEstimate} disabled={isSubmitting} />
      <PresetChips presets={presets} activePresetId={activePresetId} disabled={isSubmitting} onSelect={applyPreset} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <fieldset disabled={isSubmitting} className="space-y-3">
          <Field label="Food" htmlFor={`${id}-name`}>
            <Input
              id={`${id}-name`}
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. Paneer wrap, rough estimate"
              maxLength={120}
              autoComplete="off"
              enterKeyHint="next"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Meal" htmlFor={`${id}-meal`}>
              <Select id={`${id}-meal`} value={form.mealType} onChange={update('mealType')}>
                {MEAL_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Calories" htmlFor={`${id}-calories`}>
              <Input
                id={`${id}-calories`}
                type="number"
                inputMode="numeric"
                min="0"
                max="10000"
                step="1"
                value={form.calories}
                onChange={update('calories')}
                placeholder="kcal"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {MACRO_FIELDS.map(({ field, label }) => (
              <Field key={field} label={`${label} (g)`} htmlFor={`${id}-${field}`}>
                <Input
                  id={`${id}-${field}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={form[field]}
                  onChange={update(field)}
                  placeholder="0"
                />
              </Field>
            ))}
          </div>
        </fieldset>

        {atwater.needsFix && (form.calories || form.proteinG || form.carbsG || form.fatG) && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-100">
            <p>
              {atwater.highCarbLowCarbs
                ? `High-carb dish looks under-carbed. Atwater estimate: ${atwater.atwaterCalories} kcal.`
                : `Macros diverge from Atwater by ${Math.round(atwater.discrepancyPct)}%. Suggested: ${atwater.atwaterCalories} kcal.`}
            </p>
            <button type="button" onClick={fixMacros} className="mt-2 font-semibold text-amber-300 underline-offset-2 hover:underline">
              Fix macros / recalculate
            </button>
          </div>
        )}

        <ErrorMessage error={error} />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon className="size-4" />}
          {isSubmitting ? 'Saving…' : 'Log meal'}
        </Button>
      </form>
    </div>
  );
}
