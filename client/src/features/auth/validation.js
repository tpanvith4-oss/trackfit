export const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;

export const normalizeUsername = (value) => value.trim().toLowerCase();

export function validateLogin({ username, password }) {
  const errors = {};
  if (!username.trim()) errors.username = 'Enter your username.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegistration({ name, username, password }) {
  const errors = {};

  if (!name.trim()) errors.name = 'Enter your name.';
  else if (name.trim().length > 80) errors.name = 'Keep your name under 80 characters.';

  if (!USERNAME_PATTERN.test(normalizeUsername(username))) {
    errors.username = '3–30 characters: letters, numbers, dots or underscores.';
  }

  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (password.length > MAX_PASSWORD_LENGTH) errors.password = `Use at most ${MAX_PASSWORD_LENGTH} characters.`;

  return errors;
}

const optionalCm = (value, { min, max, label }) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = parseFloat(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return `Enter ${min}–${max} ${label}.`;
  }
  return null;
};

export function validateProfile({
  name,
  baselineWeight,
  targetWeightMin,
  targetWeightMax,
  dailyCalories,
  dailyProtein,
  heightCm,
  neckCm,
  baselineWaistCm,
  targetWaistCm,
}) {
  const errors = {};

  if (!name.trim()) errors.name = 'Enter your name.';
  else if (name.trim().length > 80) errors.name = 'Keep your name under 80 characters.';

  const weight = parseFloat(baselineWeight);
  if (!Number.isFinite(weight) || weight < 20 || weight > 500) errors.baselineWeight = 'Enter 20–500 kg.';

  const targetMin = parseFloat(targetWeightMin);
  if (!Number.isFinite(targetMin) || targetMin < 20 || targetMin > 500) errors.targetWeightMin = 'Enter 20–500 kg.';

  const targetMax = parseFloat(targetWeightMax);
  if (!Number.isFinite(targetMax) || targetMax < 20 || targetMax > 500) errors.targetWeightMax = 'Enter 20–500 kg.';

  if (!errors.targetWeightMin && !errors.targetWeightMax && targetMin > targetMax) {
    errors.targetWeightMin = 'Min target must be ≤ max target.';
  }

  const calories = parseInt(dailyCalories, 10);
  if (!Number.isFinite(calories) || calories < 800 || calories > 10000) errors.dailyCalories = 'Enter 800–10,000 kcal.';

  const protein = parseInt(dailyProtein, 10);
  if (!Number.isFinite(protein) || protein < 20 || protein > 500) errors.dailyProtein = 'Enter 20–500 g.';

  const heightError = optionalCm(heightCm, { min: 100, max: 250, label: 'cm' });
  if (heightError) errors.heightCm = heightError;

  const neckError = optionalCm(neckCm, { min: 20, max: 80, label: 'cm' });
  if (neckError) errors.neckCm = neckError;

  const waistError = optionalCm(baselineWaistCm, { min: 40, max: 200, label: 'cm' });
  if (waistError) errors.baselineWaistCm = waistError;

  const targetWaistError = optionalCm(targetWaistCm, { min: 40, max: 200, label: 'cm' });
  if (targetWaistError) errors.targetWaistCm = targetWaistError;

  return errors;
}

/** Builds the PATCH body; blank optional cm fields are omitted (or null for baseline waist). */
export function toProfilePayload(values) {
  const payload = {
    name: values.name.trim(),
    baselineWeight: parseFloat(values.baselineWeight),
    targetWeightMin: parseFloat(values.targetWeightMin),
    targetWeightMax: parseFloat(values.targetWeightMax),
    dailyCalories: parseInt(values.dailyCalories, 10),
    dailyProtein: parseInt(values.dailyProtein, 10),
  };

  if (String(values.heightCm ?? '').trim() !== '') payload.heightCm = parseFloat(values.heightCm);
  if (String(values.neckCm ?? '').trim() !== '') payload.neckCm = parseFloat(values.neckCm);
  if (String(values.targetWaistCm ?? '').trim() !== '') payload.targetWaistCm = parseFloat(values.targetWaistCm);

  if (String(values.baselineWaistCm ?? '').trim() === '') payload.baselineWaistCm = null;
  else payload.baselineWaistCm = parseFloat(values.baselineWaistCm);

  return payload;
}
