import { useId, useRef, useState } from 'react';
import { SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { roundTo, toNumberOrNull } from '../../utils/number.js';

const QUICK_TYPES = ['Treadmill', 'Strength', 'Outdoor Walk', 'Cycling', 'HIIT'];
const MAX_DURATION_MIN = 1_440;
const MAX_CALORIES = 10_000;
const MAX_DISTANCE_KM = 500;

const EMPTY_FORM = { exerciseType: '', durationMinutes: '', activeCalories: '', distanceKm: '' };

function validate(form) {
  const duration = toNumberOrNull(form.durationMinutes);
  const calories = toNumberOrNull(form.activeCalories);
  const distance = toNumberOrNull(form.distanceKm);
  if (!form.exerciseType.trim()) return 'Pick or type a workout.';
  if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_MIN) return 'Duration must be 1–1,440 whole minutes.';
  if (!Number.isInteger(calories) || calories < 0 || calories > MAX_CALORIES) return 'Calories must be a whole number up to 10,000.';
  if (form.distanceKm.trim() !== '' && (distance === null || distance < 0 || distance > MAX_DISTANCE_KM)) {
    return 'Distance must be between 0 and 500 km.';
  }
  return null;
}

export function ManualActivityForm({ onSubmit }) {
  const id = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const submittingRef = useRef(false);

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const problem = validate(form);
    if (problem) {
      setError(new Error(problem));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const distance = toNumberOrNull(form.distanceKm);
      await onSubmit({
        exerciseType: form.exerciseType.trim(),
        durationMinutes: Number(form.durationMinutes),
        activeCalories: Number(form.activeCalories),
        ...(distance !== null && { distanceKm: roundTo(distance, 2) }),
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <fieldset disabled={isSubmitting} className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick pick workout">
          {QUICK_TYPES.map((type) => {
            const active = form.exerciseType === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setForm((prev) => ({ ...prev, exerciseType: type }));
                  setError(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                    : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 active:bg-slate-800'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <Field label="Workout" htmlFor={`${id}-type`}>
          <Input
            id={`${id}-type`}
            value={form.exerciseType}
            onChange={update('exerciseType')}
            maxLength={60}
            placeholder="e.g. Treadmill"
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)" htmlFor={`${id}-duration`}>
            <Input
              id={`${id}-duration`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DURATION_MIN}
              step={1}
              value={form.durationMinutes}
              onChange={update('durationMinutes')}
              placeholder="30"
            />
          </Field>
          <Field label="Burned (kcal)" htmlFor={`${id}-calories`}>
            <Input
              id={`${id}-calories`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_CALORIES}
              step={1}
              value={form.activeCalories}
              onChange={update('activeCalories')}
              placeholder="250"
            />
          </Field>
        </div>

        <Field label="Distance (km)" htmlFor={`${id}-distance`} hint="Optional. Only log what your phone didn’t already track.">
          <Input
            id={`${id}-distance`}
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_DISTANCE_KM}
            step="0.01"
            value={form.distanceKm}
            onChange={update('distanceKm')}
            placeholder="3.2"
          />
        </Field>
      </fieldset>

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <SpinnerIcon className="size-4" />}
        {isSubmitting ? 'Saving…' : 'Log workout'}
      </Button>
    </form>
  );
}
