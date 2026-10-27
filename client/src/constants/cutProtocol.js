export const BASELINE_WAIST_CM = 85.5;
export const TARGET_WAIST_CM = 76.2;
export const WATER_TARGET_ML = 3500;
export const VACUUM_TARGET_SETS = 5;
export const PROTOCOL_START_ISO = '2026-10-24T00:00:00.000Z';

export const CUT_MILESTONES = [
  { week: 0, date: '2026-10-24', weightKg: 63.9, waistCm: 85.5, bfPct: 20.0, whtr: 0.518 },
  { week: 1, date: '2026-10-31', weightKg: 62.45, waistCm: 82.8, bfPct: 19.4, whtr: 0.502 },
  { week: 2, date: '2026-11-07', weightKg: 61.6, waistCm: 81.6, bfPct: 18.6, whtr: 0.495 },
  { week: 3, date: '2026-11-14', weightKg: 60.95, waistCm: 81.0, bfPct: 17.8, whtr: 0.491 },
  { week: 4, date: '2026-11-21', weightKg: 60.3, waistCm: 80.3, bfPct: 16.9, whtr: 0.486 },
  { week: 5, date: '2026-11-28', weightKg: 59.65, waistCm: 79.6, bfPct: 16.0, whtr: 0.482 },
  { week: 6, date: '2026-12-05', weightKg: 59.0, waistCm: 78.9, bfPct: 15.1, whtr: 0.478 },
  { week: 7, date: '2026-12-12', weightKg: 58.35, waistCm: 78.2, bfPct: 14.1, whtr: 0.474 },
  { week: 8, date: '2026-12-19', weightKg: 57.7, waistCm: 77.5, bfPct: 13.1, whtr: 0.47 },
  { week: 9, date: '2026-12-26', weightKg: 57.05, waistCm: 76.9, bfPct: 12.1, whtr: 0.466 },
  { week: 10, date: '2027-01-01', weightKg: 56.4, waistCm: 76.2, bfPct: 11.1, whtr: 0.462 },
];

export const SPLIT_DAY_LABELS = {
  PUSH: 'Push',
  PULL_ABS_A: 'Pull + Abs A',
  LEGS_QUAD: 'Legs (Quad)',
  HIIT_ABS_B: 'HIIT + Abs B',
  UPPER: 'Upper',
  LEGS_POSTERIOR_ABS_C: 'Legs Posterior + Abs C',
  REST: 'Rest',
};

export const WEEKDAY_SPLIT = {
  1: 'PUSH',
  2: 'PULL_ABS_A',
  3: 'LEGS_QUAD',
  4: 'HIIT_ABS_B',
  5: 'UPPER',
  6: 'LEGS_POSTERIOR_ABS_C',
  0: 'REST',
};

export const RECOVERY_STYLES = {
  READY: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  RECOVERING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  CONFLICT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const HIGH_CARB_NAME = /biryani|biriyani|rice|palav|pulao|idli|dosa|obbattu|holige|mudde|chapati|thali/i;

export function getMesocycleWeek(now = Date.now()) {
  const elapsed = Math.max(0, now - Date.parse(PROTOCOL_START_ISO));
  return Math.max(1, Math.min(10, Math.ceil(elapsed / (7 * 86_400_000))));
}

export function shortTemplateLabel(name) {
  if (/pro-oats/i.test(name)) return 'Pro-Oats';
  if (/soya sukka/i.test(name)) return 'Soya Roll';
  if (/shaker bridge/i.test(name)) return 'Shaker';
  if (/palak egg/i.test(name)) return 'Egg Bhurji';
  if (/chicken breast/i.test(name)) return 'Chicken Swap';
  if (/paneer/i.test(name)) return 'Paneer Swap';
  if (/cooking oil/i.test(name)) return '+1 tsp Oil';
  return name.slice(0, 18);
}

/** Live Atwater check for the meal form banner. */
export function checkAtwater({ name, calories, proteinG, carbsG, fatG }) {
  const protein = Number(proteinG) || 0;
  const carbs = Number(carbsG) || 0;
  const fat = Number(fatG) || 0;
  const logged = Math.max(0, Math.round(Number(calories) || 0));
  const atwaterCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const discrepancyPct = (Math.abs(logged - atwaterCalories) / Math.max(logged, 1)) * 100;
  const highCarbLowCarbs = HIGH_CARB_NAME.test(String(name ?? '')) && carbs < 10;
  return {
    atwaterCalories,
    discrepancyPct,
    needsFix: discrepancyPct > 12 || highCarbLowCarbs,
    highCarbLowCarbs,
  };
}
