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

export function validateRegistration({ name, username, password, baselineWeight, dailyCalories }) {
  const errors = {};

  if (!name.trim()) errors.name = 'Enter your name.';
  else if (name.trim().length > 80) errors.name = 'Keep your name under 80 characters.';

  if (!USERNAME_PATTERN.test(normalizeUsername(username))) {
    errors.username = '3–30 characters: letters, numbers, dots or underscores.';
  }

  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (password.length > MAX_PASSWORD_LENGTH) errors.password = `Use at most ${MAX_PASSWORD_LENGTH} characters.`;

  const weight = parseFloat(baselineWeight);
  if (!Number.isFinite(weight) || weight < 20 || weight > 500) errors.baselineWeight = 'Enter 20–500 kg.';

  const calories = parseInt(dailyCalories, 10);
  if (!Number.isFinite(calories) || calories < 800 || calories > 10000) errors.dailyCalories = 'Enter 800–10,000 kcal.';

  return errors;
}
