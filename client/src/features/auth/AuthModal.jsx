import { useId, useRef, useState } from 'react';
import { SpinnerIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, fieldErrorId, Input } from '../../components/ui/Field.jsx';
import { ErrorMessage } from '../../components/ui/StatusMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { PasswordInput } from './PasswordInput.jsx';
import { normalizeUsername, validateLogin, validateRegistration } from './validation.js';

const MODES = [
  { id: 'login', label: 'Log In' },
  { id: 'register', label: 'Create Profile' },
];

const COPY = {
  login: {
    title: 'Welcome back',
    subtitle: 'Log in to pick up your cut where you left off.',
    submit: 'Log In',
    submitting: 'Signing in…',
  },
  register: {
    title: 'Create your profile',
    subtitle: 'Your meals and weigh-ins stay private to your account.',
    submit: 'Create Profile',
    submitting: 'Creating profile…',
  },
};

const INITIAL_VALUES = {
  name: '',
  username: '',
  password: '',
  baselineWeight: '64.0',
  dailyCalories: '1800',
};

const KNOWN_FIELDS = new Set(Object.keys(INITIAL_VALUES));

function mapServerError(err, mode) {
  if (err?.status === 409) return { fieldErrors: { username: err.message }, formError: null };
  if (err?.status === 401 && mode === 'login') {
    return { fieldErrors: {}, formError: new Error('Invalid username or password.') };
  }
  const fieldErrors = {};
  for (const detail of err?.details ?? []) {
    if (KNOWN_FIELDS.has(detail.path) && !fieldErrors[detail.path]) fieldErrors[detail.path] = detail.message;
  }
  return Object.keys(fieldErrors).length > 0 ? { fieldErrors, formError: null } : { fieldErrors: {}, formError: err };
}

function ModeToggle({ mode, onChange, disabled }) {
  return (
    <div role="tablist" aria-label="Account mode" className="relative grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-slate-800 shadow-md shadow-black/30 ring-1 ring-slate-700 transition-transform duration-300 ease-out ${
          mode === 'register' ? 'translate-x-full' : ''
        }`}
      />
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors ${
            mode === id ? 'text-slate-50' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AuthModal() {
  const id = useId();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef(null);

  const copy = COPY[mode];
  const isRegister = mode === 'register';
  const fieldId = (name) => `${id}-${name}`;

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  };

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

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => {
      const form = formRef.current;
      (form?.querySelector('[aria-invalid="true"]') ?? form?.querySelector('input[name="password"]'))?.focus();
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const errors = isRegister ? validateRegistration(values) : validateLogin(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      focusFirstInvalid();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      if (isRegister) {
        await register({
          name: values.name.trim(),
          username: normalizeUsername(values.username),
          password: values.password,
          baselineWeight: parseFloat(values.baselineWeight),
          dailyCalories: parseInt(values.dailyCalories, 10),
        });
      } else {
        await login({ username: normalizeUsername(values.username), password: values.password });
      }
    } catch (err) {
      const mapped = mapServerError(err, mode);
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
      focusFirstInvalid();
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-64 translate-x-1/3 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-subtitle`}
        className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl motion-safe:animate-pop-in"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <img src="favicon.svg" alt="" className="size-7" />
          </div>
          <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-slate-50">
            {copy.title}
          </h2>
          <p id={`${id}-subtitle`} className="mt-1 text-sm text-slate-400">
            {copy.subtitle}
          </p>
        </div>

        <ModeToggle mode={mode} onChange={switchMode} disabled={isSubmitting} />

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <fieldset key={mode} disabled={isSubmitting} className="space-y-4 motion-safe:animate-fade-in">
            {isRegister && (
              <Field label="Full name" htmlFor={fieldId('name')} error={fieldErrors.name}>
                <Input {...fieldProps('name')} autoComplete="name" autoCapitalize="words" placeholder="e.g. Panvith T" maxLength={80} />
              </Field>
            )}

            <Field
              label={isRegister ? 'Desired username' : 'Username'}
              htmlFor={fieldId('username')}
              error={fieldErrors.username}
              hint={isRegister ? 'Letters, numbers, dots or underscores.' : undefined}
            >
              <Input
                {...fieldProps('username')}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                maxLength={30}
                placeholder="e.g. panvith"
              />
            </Field>

            <Field
              label="Password"
              htmlFor={fieldId('password')}
              error={fieldErrors.password}
              hint={isRegister ? 'At least 6 characters.' : undefined}
            >
              <PasswordInput
                {...fieldProps('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                enterKeyHint={isRegister ? 'next' : 'go'}
                maxLength={72}
              />
            </Field>

            {isRegister && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="mb-3 text-xs font-medium text-slate-400">
                  Starting point <span className="text-slate-600">· optional, pre-filled with the default cut</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Weight (kg)" htmlFor={fieldId('baselineWeight')} error={fieldErrors.baselineWeight}>
                    <Input {...fieldProps('baselineWeight')} type="number" inputMode="decimal" min="20" max="500" step="0.1" />
                  </Field>
                  <Field label="Calories / day" htmlFor={fieldId('dailyCalories')} error={fieldErrors.dailyCalories}>
                    <Input {...fieldProps('dailyCalories')} type="number" inputMode="numeric" min="800" max="10000" step="50" />
                  </Field>
                </div>
              </div>
            )}
          </fieldset>

          <ErrorMessage error={formError} />

          <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
            {isSubmitting && <SpinnerIcon className="size-4" />}
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isRegister ? 'Already have a profile?' : 'New to TrackFit?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            disabled={isSubmitting}
            className="font-semibold text-brand-400 underline-offset-4 hover:underline"
          >
            {isRegister ? 'Log in' : 'Create a profile'}
          </button>
        </p>
      </section>
    </div>
  );
}
