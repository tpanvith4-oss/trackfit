import { useId, useRef, useState } from 'react';
import { SpinnerIcon, UserIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, fieldErrorId, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { toProfilePayload, validateProfile } from '../auth/validation.js';

const PROFILE_FIELDS = [
  'name',
  'baselineWeight',
  'targetWeightMin',
  'targetWeightMax',
  'dailyCalories',
  'dailyProtein',
  'heightCm',
  'neckCm',
  'baselineWaistCm',
  'targetWaistCm',
];
const KNOWN_FIELDS = new Set(PROFILE_FIELDS);

const toFormValues = (user) => ({
  name: user.name ?? '',
  baselineWeight: '',
  targetWeightMin: '',
  targetWeightMax: '',
  dailyCalories: '',
  dailyProtein: '',
  heightCm: '',
  neckCm: '',
  baselineWaistCm: '',
  targetWaistCm: '',
});

function mapServerError(err) {
  const fieldErrors = {};
  for (const detail of err?.details ?? []) {
    if (KNOWN_FIELDS.has(detail.path) && !fieldErrors[detail.path]) fieldErrors[detail.path] = detail.message;
  }
  return Object.keys(fieldErrors).length > 0 ? { fieldErrors, formError: null } : { fieldErrors: {}, formError: err };
}

export function OnboardingProfile() {
  const id = useId();
  const { user, updateProfile, logout } = useAuth();
  const [values, setValues] = useState(() => toFormValues(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef(null);

  const fieldId = (name) => `${id}-${name}`;

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
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

    try {
      await updateProfile(toProfilePayload(values));
    } catch (err) {
      const mapped = mapServerError(err);
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] motion-safe:animate-fade-in">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/30">
        <header className="mb-5 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30">
            <UserIcon className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Set up your profile</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Welcome{user?.name ? `, ${user.name.split(/\s+/)[0]}` : ''}. Add your starting numbers so food, weight, and waist tracking
              stay accurate.
            </p>
            <p className="mt-1 text-xs text-slate-500">@{user?.username}</p>
          </div>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-3">
            <Field label="Name" htmlFor={fieldId('name')} error={fieldErrors.name}>
              <Input {...fieldProps('name')} autoComplete="name" maxLength={80} required />
            </Field>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Starting point</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Current weight" htmlFor={fieldId('baselineWeight')} error={fieldErrors.baselineWeight} hint="kg">
                  <Input {...fieldProps('baselineWeight')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
                </Field>
                <Field label="Calories / day" htmlFor={fieldId('dailyCalories')} error={fieldErrors.dailyCalories} hint="kcal">
                  <Input {...fieldProps('dailyCalories')} type="number" inputMode="numeric" min="800" max="10000" step="50" required />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Protein / day" htmlFor={fieldId('dailyProtein')} error={fieldErrors.dailyProtein} hint="grams">
                  <Input {...fieldProps('dailyProtein')} type="number" inputMode="numeric" min="20" max="500" step="5" required />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Target min" htmlFor={fieldId('targetWeightMin')} error={fieldErrors.targetWeightMin} hint="kg">
                  <Input {...fieldProps('targetWeightMin')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
                </Field>
                <Field label="Target max" htmlFor={fieldId('targetWeightMax')} error={fieldErrors.targetWeightMax} hint="kg">
                  <Input {...fieldProps('targetWeightMax')} type="number" inputMode="decimal" min="20" max="500" step="0.1" required />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Body metrics</p>
              <p className="mb-3 text-xs text-slate-500">Optional — used for waist / BF% tracking. You can fill these later.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height" htmlFor={fieldId('heightCm')} error={fieldErrors.heightCm} hint="cm">
                  <Input {...fieldProps('heightCm')} type="number" inputMode="decimal" min="100" max="250" step="0.1" placeholder="e.g. 165" />
                </Field>
                <Field label="Neck" htmlFor={fieldId('neckCm')} error={fieldErrors.neckCm} hint="cm">
                  <Input {...fieldProps('neckCm')} type="number" inputMode="decimal" min="20" max="80" step="0.1" placeholder="e.g. 37" />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Current waist" htmlFor={fieldId('baselineWaistCm')} error={fieldErrors.baselineWaistCm} hint="cm">
                  <Input
                    {...fieldProps('baselineWaistCm')}
                    type="number"
                    inputMode="decimal"
                    min="40"
                    max="200"
                    step="0.1"
                    placeholder="e.g. 85.5"
                  />
                </Field>
                <Field label="Target waist" htmlFor={fieldId('targetWaistCm')} error={fieldErrors.targetWaistCm} hint="cm">
                  <Input
                    {...fieldProps('targetWaistCm')}
                    type="number"
                    inputMode="decimal"
                    min="40"
                    max="200"
                    step="0.1"
                    placeholder="e.g. 76.2"
                  />
                </Field>
              </div>
            </div>
          </fieldset>

          <ErrorMessage error={formError} />

          <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon className="size-4" />}
            {isSubmitting ? 'Saving profile…' : 'Save & continue'}
          </Button>

          <button
            type="button"
            onClick={logout}
            disabled={isSubmitting}
            className="w-full py-2 text-center text-sm text-slate-500 transition hover:text-slate-300"
          >
            Log out
          </button>
        </form>
      </section>
    </main>
  );
}
