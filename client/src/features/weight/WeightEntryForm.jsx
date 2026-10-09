import { useId, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { toNumberOrNull } from '../../utils/number.js';

export function WeightEntryForm({ onSubmit, lastWeightKg }) {
  const id = useId();
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        weightKg: toNumberOrNull(weightKg),
        note: note.trim() || null,
      });
      setWeightKg('');
      setNote('');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Weight (kg)" htmlFor={`${id}-weight`}>
        <Input
          id={`${id}-weight`}
          type="number"
          inputMode="decimal"
          min="1"
          max="500"
          step="0.1"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          placeholder={lastWeightKg ? String(lastWeightKg) : '70.0'}
          required
        />
      </Field>

      <Field label="Note" htmlFor={`${id}-note`} hint="Optional — e.g. morning, after workout">
        <Input
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          autoComplete="off"
        />
      </Field>

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Log weight'}
      </Button>
    </form>
  );
}
