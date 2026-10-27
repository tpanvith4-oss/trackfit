/** 10-week cut protocol: 2026-10-24 → 2027-01-01. Shared by seed + services. */

export const PROTOCOL_START_ISO = '2026-10-24T00:00:00.000Z';
export const PROTOCOL_DEADLINE_ISO = '2027-01-01T00:00:00.000Z';
export const PROTOCOL_START_MS = Date.parse(PROTOCOL_START_ISO);
export const TARGET_WAIST_CM = 76.2;
export const BASELINE_WAIST_CM = 85.5;
export const WATER_TARGET_ML = 3500;
export const VACUUM_TARGET_SETS = 5;

export const CUT_MILESTONES = Object.freeze([
  {
    week: 0,
    date: '2026-10-24',
    weightKg: 63.9,
    fatKg: 12.78,
    bfPct: 20.0,
    waistCm: 85.5,
    whtr: 0.518,
    note: 'Faint pale upper outline flexed',
  },
  {
    week: 1,
    date: '2026-10-31',
    weightKg: 62.45,
    fatKg: 12.13,
    bfPct: 19.4,
    waistCm: 82.8,
    whtr: 0.502,
    note: '-2.7 cm waist drop from gut de-bloat & glycogen water',
  },
  {
    week: 2,
    date: '2026-11-07',
    weightKg: 61.6,
    fatKg: 11.48,
    bfPct: 18.6,
    waistCm: 81.6,
    whtr: 0.495,
    note: 'WHtR drops below 0.50; lower belly flattens',
  },
  {
    week: 3,
    date: '2026-11-14',
    weightKg: 60.95,
    fatKg: 10.83,
    bfPct: 17.8,
    waistCm: 81.0,
    whtr: 0.491,
    note: 'Upper abdominal separation deepens flexed',
  },
  {
    week: 4,
    date: '2026-11-21',
    weightKg: 60.3,
    fatKg: 10.18,
    bfPct: 16.9,
    waistCm: 80.3,
    whtr: 0.486,
    note: 'Linea alba & top 2 abs visible flexed',
  },
  {
    week: 5,
    date: '2026-11-28',
    weightKg: 59.65,
    fatKg: 9.53,
    bfPct: 16.0,
    waistCm: 79.6,
    whtr: 0.482,
    note: 'Waist breaks <80 cm; flank thickness recedes',
  },
  {
    week: 6,
    date: '2026-12-05',
    weightKg: 59.0,
    fatKg: 8.88,
    bfPct: 15.1,
    waistCm: 78.9,
    whtr: 0.478,
    note: 'Enters <79.0 cm zone; upper 4-pack visible in overhead light',
  },
  {
    week: 7,
    date: '2026-12-12',
    weightKg: 58.35,
    fatKg: 8.23,
    bfPct: 14.1,
    waistCm: 78.2,
    whtr: 0.474,
    note: 'Clear 4-pack flexed; flat unflexed abdominal wall',
  },
  {
    week: 8,
    date: '2026-12-19',
    weightKg: 57.7,
    fatKg: 7.58,
    bfPct: 13.1,
    waistCm: 77.5,
    whtr: 0.47,
    note: 'Enters <=77.5 cm zone; 4-pack visible unflexed',
  },
  {
    week: 9,
    date: '2026-12-26',
    weightKg: 57.05,
    fatKg: 6.93,
    bfPct: 12.1,
    waistCm: 76.9,
    whtr: 0.466,
    note: 'Serratus anterior and oblique lines sharpen',
  },
  {
    week: 10,
    date: '2027-01-01',
    weightKg: 56.4,
    fatKg: 6.28,
    bfPct: 11.1,
    waistCm: 76.2,
    whtr: 0.462,
    note: 'Defined 4-to-6 pack shape achieved (-9.3 cm waist)',
  },
]);

export const MEAL_TEMPLATE_SEEDS = Object.freeze([
  {
    sortOrder: 1,
    mealType: 'BREAKFAST',
    name: 'Lean Pro-Oats Bowl (50g Oats + 100ml Slim Milk + 1 Scoop Whey + 8g Seeds)',
    calories: 385,
    proteinG: 36.5,
    carbsG: 43.0,
    fatG: 7.2,
    fiberG: 6.0,
    diaasScore: 1.05,
    costInr: 92,
  },
  {
    sortOrder: 2,
    mealType: 'LUNCH',
    name: 'Office Foil Soya Sukka Roll (50g Dry Soya + 2 Chapatis + 200g Nandini Curd)',
    calories: 485,
    proteinG: 38.0,
    carbsG: 62.5,
    fatG: 9.2,
    fiberG: 9.5,
    diaasScore: 0.94,
    costInr: 28,
    recipeNotes: 'Boil 5m with hing, cold rinse & squeeze 3x, dry-saute in 3g oil',
  },
  {
    sortOrder: 3,
    mealType: 'SNACK',
    name: 'Office Shaker Bridge (1 Scoop Whey in Water + 25g Roasted Bhuna Chana)',
    calories: 210,
    proteinG: 30.0,
    carbsG: 17.5,
    fatG: 2.8,
    fiberG: 4.5,
    diaasScore: 1.06,
    costInr: 75,
  },
  {
    sortOrder: 4,
    mealType: 'DINNER',
    name: 'Palak Egg Bhurji (3 Whole Eggs + 3 Egg Whites + 100g Spinach + 1 Chapati)',
    calories: 460,
    proteinG: 33.5,
    carbsG: 26.0,
    fatG: 23.0,
    fiberG: 4.0,
    diaasScore: 1.1,
    costInr: 48,
  },
  {
    sortOrder: 5,
    mealType: 'LUNCH',
    name: 'Swap: 150g Raw Chicken Breast + 30g Curd Marinade + 3g Oil',
    calories: 210,
    proteinG: 35.5,
    carbsG: 1.5,
    fatG: 4.5,
    fiberG: 0,
    diaasScore: 1.08,
    costInr: 55,
  },
  {
    sortOrder: 6,
    mealType: 'DINNER',
    name: 'Swap: 100g Milky Mist High-Protein Low-Fat Paneer',
    calories: 204,
    proteinG: 25.0,
    carbsG: 5.7,
    fatG: 9.0,
    fiberG: 0,
    diaasScore: 1.07,
    costInr: 51,
  },
  {
    sortOrder: 7,
    mealType: 'SNACK',
    name: 'Quick Add: +1 tsp Cooking Oil (5ml)',
    calories: 40,
    proteinG: 0,
    carbsG: 0,
    fatG: 4.5,
    fiberG: 0,
    diaasScore: 1.0,
    costInr: 1,
  },
]);

/** Preset exercises for each training day. reps may be a range string for display. */
export const WORKOUT_SPLIT_PRESETS = Object.freeze({
  PUSH: [
    { exerciseName: 'Incline Dumbbell Press (30° Bench)', primaryMuscle: 'CHEST', secondaryMuscles: ['FRONT_DELTS', 'TRICEPS'], sets: 4, reps: '8-10' },
    { exerciseName: 'Flat Barbell or Machine Chest Press', primaryMuscle: 'CHEST', secondaryMuscles: ['FRONT_DELTS', 'TRICEPS'], sets: 3, reps: '8-10' },
    { exerciseName: 'Seated Dumbbell Shoulder Press', primaryMuscle: 'FRONT_DELTS', secondaryMuscles: ['SIDE_DELTS', 'TRICEPS'], sets: 3, reps: '8-12' },
    { exerciseName: 'Cable or Dumbbell Lateral Raises', primaryMuscle: 'SIDE_DELTS', secondaryMuscles: [], sets: 4, reps: '12-15' },
    { exerciseName: 'Overhead Cable Triceps Extension (Rope)', primaryMuscle: 'TRICEPS', secondaryMuscles: [], sets: 3, reps: '10-12' },
    { exerciseName: 'Triceps Rope Pushdowns', primaryMuscle: 'TRICEPS', secondaryMuscles: [], sets: 3, reps: '12-15' },
  ],
  PULL_ABS_A: [
    { exerciseName: 'Wide-Grip Lat Pulldowns', primaryMuscle: 'LATS', secondaryMuscles: ['BICEPS', 'UPPER_BACK'], sets: 4, reps: '8-12' },
    { exerciseName: 'Chest-Supported T-Bar or Cable Row', primaryMuscle: 'UPPER_BACK', secondaryMuscles: ['LATS', 'REAR_DELTS', 'BICEPS'], sets: 4, reps: '8-10' },
    { exerciseName: 'Rope Face Pulls', primaryMuscle: 'REAR_DELTS', secondaryMuscles: ['UPPER_BACK'], sets: 3, reps: '15' },
    { exerciseName: 'Incline Dumbbell Curls', primaryMuscle: 'BICEPS', secondaryMuscles: [], sets: 3, reps: '10-12' },
    { exerciseName: 'Hammer Curls', primaryMuscle: 'BICEPS', secondaryMuscles: [], sets: 3, reps: '10-12' },
    { exerciseName: 'Kneeling Rope Cable Crunches', primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: ['OBLIQUES'], sets: 4, reps: '12-15' },
    { exerciseName: 'Hanging Leg Raises (Posterior Pelvic Tilt)', primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: [], sets: 3, reps: '10-15' },
  ],
  LEGS_QUAD: [
    { exerciseName: 'Barbell Back Squat or Hack Squat', primaryMuscle: 'QUADS', secondaryMuscles: ['GLUTES', 'SPINAL_ERECTORS'], sets: 4, reps: '6-10' },
    { exerciseName: 'Leg Press (Feet Lower)', primaryMuscle: 'QUADS', secondaryMuscles: ['GLUTES'], sets: 3, reps: '10-12' },
    { exerciseName: 'Seated or Lying Leg Curls', primaryMuscle: 'HAMSTRINGS', secondaryMuscles: [], sets: 3, reps: '10-12' },
    { exerciseName: 'Leg Extensions', primaryMuscle: 'QUADS', secondaryMuscles: [], sets: 3, reps: '12-15' },
    { exerciseName: 'Standing Calf Raises', primaryMuscle: 'CALVES', secondaryMuscles: [], sets: 4, reps: '12-15' },
  ],
  HIIT_ABS_B: [
    { exerciseName: 'Stomach Vacuums (TVA Cincher)', primaryMuscle: 'TVA', secondaryMuscles: [], sets: 5, reps: '25 sec holds' },
    { exerciseName: 'Decline Weighted Crunch or Ab Wheel', primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: [], sets: 4, reps: '12-15' },
    { exerciseName: 'High-to-Low Cable Woodchoppers', primaryMuscle: 'OBLIQUES', secondaryMuscles: ['RECTUS_ABDOMINIS'], sets: 3, reps: '12-15' },
    { exerciseName: 'Weighted Plank (Posterior Pelvic Tilt)', primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: ['TVA', 'OBLIQUES'], sets: 3, reps: '60 sec holds' },
  ],
  UPPER: [
    { exerciseName: 'Incline Machine or Barbell Press', primaryMuscle: 'CHEST', secondaryMuscles: ['FRONT_DELTS', 'TRICEPS'], sets: 3, reps: '8-10' },
    { exerciseName: 'Neutral-Grip Lat Pulldowns', primaryMuscle: 'LATS', secondaryMuscles: ['BICEPS'], sets: 3, reps: '10-12' },
    { exerciseName: 'Single-Arm Dumbbell or Machine Row', primaryMuscle: 'UPPER_BACK', secondaryMuscles: ['LATS', 'BICEPS'], sets: 3, reps: '10-12' },
    { exerciseName: 'High-to-Low Cable Pec Flyes', primaryMuscle: 'CHEST', secondaryMuscles: [], sets: 3, reps: '12-15' },
    { exerciseName: 'Dumbbell Lateral Raises', primaryMuscle: 'SIDE_DELTS', secondaryMuscles: [], sets: 4, reps: '15' },
    { exerciseName: 'Preacher Curls', primaryMuscle: 'BICEPS', secondaryMuscles: [], sets: 3, reps: '12' },
    { exerciseName: 'Skullcrushers or Dip Machine', primaryMuscle: 'TRICEPS', secondaryMuscles: [], sets: 3, reps: '12' },
  ],
  LEGS_POSTERIOR_ABS_C: [
    { exerciseName: 'Romanian Deadlifts (Barbell/DB)', primaryMuscle: 'HAMSTRINGS', secondaryMuscles: ['GLUTES', 'SPINAL_ERECTORS'], sets: 4, reps: '8-10' },
    { exerciseName: 'Bulgarian Split Squats', primaryMuscle: 'GLUTES', secondaryMuscles: ['QUADS'], sets: 3, reps: '10' },
    { exerciseName: 'Seated Leg Curls', primaryMuscle: 'HAMSTRINGS', secondaryMuscles: [], sets: 3, reps: '12-15' },
    { exerciseName: 'Seated Calf Raises', primaryMuscle: 'CALVES', secondaryMuscles: [], sets: 3, reps: '15' },
    { exerciseName: 'Behind-the-Back Cable Lateral Raises', primaryMuscle: 'SIDE_DELTS', secondaryMuscles: [], sets: 3, reps: '12-15' },
    { exerciseName: "Captain's Chair / Hanging Leg Raises", primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: [], sets: 4, reps: '12-15' },
    { exerciseName: 'Rope Cable Crunches', primaryMuscle: 'RECTUS_ABDOMINIS', secondaryMuscles: [], sets: 4, reps: '12-15' },
    { exerciseName: 'Slow-Tempo Bicycle Crunches', primaryMuscle: 'OBLIQUES', secondaryMuscles: ['RECTUS_ABDOMINIS'], sets: 3, reps: '15' },
  ],
  REST: [],
});

export const SPLIT_DAY_LABELS = Object.freeze({
  PUSH: 'Push',
  PULL_ABS_A: 'Pull + Abs A',
  LEGS_QUAD: 'Legs (Quad)',
  HIIT_ABS_B: 'HIIT + Abs B',
  UPPER: 'Upper',
  LEGS_POSTERIOR_ABS_C: 'Legs Posterior + Abs C',
  REST: 'Rest',
});

/** Maps JS weekday (0=Sun … 6=Sat) to the default split for that day. */
export const WEEKDAY_SPLIT = Object.freeze({
  1: 'PUSH',
  2: 'PULL_ABS_A',
  3: 'LEGS_QUAD',
  4: 'HIIT_ABS_B',
  5: 'UPPER',
  6: 'LEGS_POSTERIOR_ABS_C',
  0: 'REST',
});

export function getMesocycleWeek(now = Date.now()) {
  const elapsedMs = Math.max(0, now - PROTOCOL_START_MS);
  return Math.max(1, Math.min(10, Math.ceil(elapsedMs / (7 * 86_400_000))));
}

export function getMilestoneForWeek(week) {
  return CUT_MILESTONES.find((m) => m.week === week) ?? CUT_MILESTONES[CUT_MILESTONES.length - 1];
}
