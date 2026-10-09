import { useId, useRef, useState } from 'react';
import { SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { MEAL_TYPES, QUICK_STAPLES } from './constants.js';
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

function PresetChips({ activePresetId, disabled, onSelect }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
      <ul className="flex w-max snap-x gap-2 pb-1" aria-label="Quick staples">
        {QUICK_STAPLES.map((preset) => {
          const active = preset.id === activePresetId;
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
  const submittingRef = useRef(false);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const applyPreset = (preset) => {
    setForm({
      name: preset.name,
      mealType: preset.mealType,
      calories: String(preset.calories),
      proteinG: String(preset.proteinG),
      carbsG: String(preset.carbsG),
      fatG: String(preset.fatG),
    });
    setActivePresetId(preset.id);
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
      });
      setForm(createInitialForm());
      setActivePresetId(null);
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PresetChips activePresetId={activePresetId} disabled={isSubmitting} onSelect={applyPreset} />

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

        <ErrorMessage error={error} />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon className="size-4" />}
          {isSubmitting ? 'Saving…' : 'Log meal'}
        </Button>
      </form>
    </div>
  );
}
