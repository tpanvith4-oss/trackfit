import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { measurementsApi } from '../../api/measurementsApi.js';
import { CloseIcon, ScaleIcon, SpinnerIcon } from '../../components/icons.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function MeasurementModal({ onClose, onSaved, defaults = {} }) {
  const id = useId();
  const { user } = useAuth();
  const [values, setValues] = useState({
    weightKg: String(defaults.weightKg ?? user?.baselineWeight ?? ''),
    waistUmbilicalCm: String(defaults.waistUmbilicalCm ?? ''),
    neckCm: String(defaults.neckCm ?? user?.neckCm ?? 37),
    giBloatScore: String(defaults.giBloatScore ?? 1),
    note: defaults.note ?? '',
    isFasted: defaults.isFasted ?? true,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await measurementsApi.create({
        weightKg: parseFloat(values.weightKg),
        waistUmbilicalCm: parseFloat(values.waistUmbilicalCm),
        neckCm: parseFloat(values.neckCm),
        giBloatScore: parseInt(values.giBloatScore, 10),
        note: values.note.trim() || null,
        isFasted: Boolean(values.isFasted),
      });
      onSaved?.(result);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fade-in sm:items-center sm:p-4"
      onClick={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-800 bg-slate-900 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
            <ScaleIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-100">
              Fasted waist & weight
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">Log umbilical waist + scale weight. US Navy BF% and WHtR update automatically.</p>
          </div>
          <IconButton label="Close" onClick={onClose} disabled={saving} className="-mt-1 -mr-2">
            <CloseIcon className="size-5" />
          </IconButton>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <fieldset disabled={saving} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)" htmlFor={`${id}-weight`}>
                <Input id={`${id}-weight`} type="number" step="0.1" min="20" max="500" value={values.weightKg} onChange={update('weightKg')} required />
              </Field>
              <Field label="Waist umbilical (cm)" htmlFor={`${id}-waist`}>
                <Input
                  id={`${id}-waist`}
                  type="number"
                  step="0.1"
                  min="40"
                  max="200"
                  value={values.waistUmbilicalCm}
                  onChange={update('waistUmbilicalCm')}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Neck (cm)" htmlFor={`${id}-neck`}>
                <Input id={`${id}-neck`} type="number" step="0.1" min="20" max="80" value={values.neckCm} onChange={update('neckCm')} required />
              </Field>
              <Field label="GI bloat (1–5)" htmlFor={`${id}-bloat`}>
                <Input id={`${id}-bloat`} type="number" min="1" max="5" step="1" value={values.giBloatScore} onChange={update('giBloatScore')} />
              </Field>
            </div>
            <Field label="Note" htmlFor={`${id}-note`}>
              <Input id={`${id}-note`} value={values.note} onChange={update('note')} maxLength={280} placeholder="Optional" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={values.isFasted} onChange={update('isFasted')} className="size-4 rounded border-slate-600" />
              Fasted morning measurement
            </label>
          </fieldset>
          <ErrorMessage error={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <SpinnerIcon className="size-4" />}
            {saving ? 'Saving…' : 'Save check-in'}
          </Button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
