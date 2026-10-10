import { useId, useRef, useState } from 'react';
import { SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { formatDay } from '../../utils/date.js';
import { formatFixed, formatSigned, roundTo } from '../../utils/number.js';
import { QUICK_ADJUSTMENTS_KG } from './constants.js';

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 500;

function describeReference({ entry, relation }) {
  if (relation === 'yesterday') return 'yesterday';
  if (relation === 'today') return 'earlier today';
  return formatDay(entry.loggedAt);
}

function QuickAdjustments({ reference, currentValue, disabled, onPick }) {
  const baseKg = reference.entry.weightKg;
  const referenceLabel = describeReference(reference);

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={`Quick set relative to ${referenceLabel}`}>
        {QUICK_ADJUSTMENTS_KG.map((step) => {
          const value = roundTo(baseKg + step, 1);
          const active = currentValue !== '' && roundTo(parseFloat(currentValue), 1) === value;
          return (
            <button
              key={step}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={`Set ${formatFixed(value)} kg (${step === 0 ? 'same as' : `${formatSigned(step)} kg from`} ${referenceLabel})`}
              onClick={() => onPick(value)}
              className={`rounded-lg border py-2 text-sm font-semibold tabular-nums transition disabled:opacity-50 ${
                active
                  ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                  : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 active:bg-slate-800'
              }`}
            >
              {step === 0 ? 'Same' : formatSigned(step)}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Relative to {referenceLabel}:{' '}
        <span className="font-semibold tabular-nums text-slate-300">{formatFixed(baseKg)} kg</span>
      </p>
    </div>
  );
}

export function WeightForm({ onSubmit, reference, fallbackWeightKg }) {
  const id = useId();
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const submittingRef = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const parsedWeight = parseFloat(weightKg);
    if (!Number.isFinite(parsedWeight) || parsedWeight < MIN_WEIGHT_KG || parsedWeight > MAX_WEIGHT_KG) {
      setError(new Error(`Enter a weight between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        weightKg: roundTo(parsedWeight, 2),
        note: note.trim() || null,
      });
      setWeightKg('');
      setNote('');
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <fieldset disabled={isSubmitting} className="space-y-3">
        <Field label="Weight (kg)" htmlFor={`${id}-weight`}>
          <Input
            id={`${id}-weight`}
            type="number"
            inputMode="decimal"
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            step="0.1"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            placeholder={formatFixed(reference?.entry.weightKg ?? fallbackWeightKg ?? 64)}
            required
          />
        </Field>

        {reference && (
          <QuickAdjustments
            reference={reference}
            currentValue={weightKg}
            disabled={isSubmitting}
            onPick={(value) => {
              setWeightKg(value.toFixed(1));
              setError(null);
            }}
          />
        )}

        <Field label="Note" htmlFor={`${id}-note`} hint="Optional — e.g. post-refeed, poor sleep, high sodium">
          <Input
            id={`${id}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={280}
            autoComplete="off"
          />
        </Field>
      </fieldset>

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <SpinnerIcon className="size-4" />}
        {isSubmitting ? 'Saving…' : 'Log weight'}
      </Button>
    </form>
  );
}
