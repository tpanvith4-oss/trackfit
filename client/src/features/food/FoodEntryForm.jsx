import { useId, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { inferMealType } from '../../utils/date.js';
import { toNumberOrNull } from '../../utils/number.js';
import { MEAL_TYPES } from './constants.js';

const emptyForm = () => ({
  name: '',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  mealType: inferMealType(),
});

export function FoodEntryForm({ onSubmit }) {
  const id = useId();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        calories: Math.round(toNumberOrNull(form.calories) ?? 0),
        proteinG: toNumberOrNull(form.proteinG),
        carbsG: toNumberOrNull(form.carbsG),
        fatG: toNumberOrNull(form.fatG),
        mealType: form.mealType,
      });
      setForm(emptyForm());
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Food" htmlFor={`${id}-name`}>
        <Input
          id={`${id}-name`}
          value={form.name}
          onChange={update('name')}
          placeholder="e.g. Greek yogurt"
          maxLength={120}
          autoComplete="off"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
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
        <Field label="Meal" htmlFor={`${id}-meal`}>
          <Select id={`${id}-meal`} value={form.mealType} onChange={update('mealType')}>
            {MEAL_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['proteinG', 'Protein'],
          ['carbsG', 'Carbs'],
          ['fatG', 'Fat'],
        ].map(([field, label]) => (
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

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Add food'}
      </Button>
    </form>
  );
}
