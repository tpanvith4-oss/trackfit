import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, SpinnerIcon, UserIcon } from '../../components/icons.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { Field, fieldErrorId, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { validateProfile } from '../auth/validation.js';

const PROFILE_FIELDS = ['name', 'baselineWeight', 'targetWeightMin', 'targetWeightMax', 'dailyCalories', 'dailyProtein'];
const KNOWN_FIELDS = new Set(PROFILE_FIELDS);

const toFormValues = (user) => ({
  name: user.name ?? '',
  baselineWeight: String(user.baselineWeight ?? ''),
  targetWeightMin: String(user.targetWeightMin ?? ''),
  targetWeightMax: String(user.targetWeightMax ?? ''),
  dailyCalories: String(user.dailyCalories ?? ''),
  dailyProtein: String(user.dailyProtein ?? ''),
});

function mapServerError(err) {
  const fieldErrors = {};
  for (const detail of err?.details ?? []) {
    if (KNOWN_FIELDS.has(detail.path) && !fieldErrors[detail.path]) fieldErrors[detail.path] = detail.message;
  }
  return Object.keys(fieldErrors).length > 0 ? { fieldErrors, formError: null } : { fieldErrors: {}, formError: err };
}

export function ProfileModal({ onClose }) {
  const id = useId();
  const { user, updateProfile } = useAuth();
  const [values, setValues] = useState(() => toFormValues(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const fieldId = (name) => `${id}-${name}`;

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const fieldProps = (name) => ({
    id: fieldId(name),
    name,
    value: values[name],
    onChange: update(name),
    'aria-invalid': Boolean(fieldErrors[name]),
    'aria-describedby': fieldErrors[name] ? fieldErrorId(fieldId(name)) : undefined,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const errors = validateProfile(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setSaved(false);

    try {
      await updateProfile({
        name: values.name.trim(),
        baselineWeight: parseFloat(values.baselineWeight),
        targetWeightMin: parseFloat(values.targetWeightMin),
        targetWeightMax: parseFloat(values.targetWeightMax),
        dailyCalories: parseInt(values.dailyCalories, 10),
        dailyProtein: parseInt(values.dailyProtein, 10),
      });
      setSaved(true);
    } catch (err) {
      const mapped = mapServerError(err);
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fade-in sm:items-center sm:p-4"
      onClick={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-subtitle`}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-800 bg-slate-900 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 motion-safe:animate-pop-in sm:rounded-3xl"
      >
        <header className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30">
            <UserIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-100">
              Edit profile
            </h2>
            <p id={`${id}-subtitle`} className="mt-0.5 text-sm text-slate-400">
              Update your goals and starting numbers. Food and weight screens use these right away.
            </p>
          </div>
          <IconButton ref={closeButtonRef} label="Close" onClick={onClose} disabled={isSubmitting} className="-mt-1 -mr-2 shrink-0">
            <CloseIcon className="size-5" />
          </IconButton>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="mt-5 space-y-3">
          <fieldset disabled={isSubmitting} className="space-y-3">
            <Field label="Name" htmlFor={fieldId('name')} error={fieldErrors.name}>
              <Input {...fieldProps('name')} autoComplete="name" maxLength={80} required />
            </Field>

            <Field label="Username" htmlFor={fieldId('username')} hint="Username can’t be changed.">
              <Input id={fieldId('username')} value={`@${user.username}`} readOnly disabled className="opacity-70" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Baseline weight" htmlFor={fieldId('baselineWeight')} error={fieldErrors.baselineWeight} hint="kg">
                <Input {...fieldProps('baselineWeight')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
              </Field>
              <Field label="Calories / day" htmlFor={fieldId('dailyCalories')} error={fieldErrors.dailyCalories} hint="kcal">
                <Input {...fieldProps('dailyCalories')} type="number" inputMode="numeric" min="800" max="10000" step="50" required />
              </Field>
            </div>

            <Field label="Protein / day" htmlFor={fieldId('dailyProtein')} error={fieldErrors.dailyProtein} hint="grams">
              <Input {...fieldProps('dailyProtein')} type="number" inputMode="numeric" min="20" max="500" step="5" required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Target min" htmlFor={fieldId('targetWeightMin')} error={fieldErrors.targetWeightMin} hint="kg">
                <Input {...fieldProps('targetWeightMin')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
              </Field>
              <Field label="Target max" htmlFor={fieldId('targetWeightMax')} error={fieldErrors.targetWeightMax} hint="kg">
                <Input {...fieldProps('targetWeightMax')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
              </Field>
            </div>
          </fieldset>

          <ErrorMessage error={formError} />
          {saved && !formError && (
            <p role="status" className="rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
              Profile saved. Your targets are updated.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1 border border-slate-700" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <SpinnerIcon className="size-4" />}
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
