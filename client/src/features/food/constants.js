export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

export const MEAL_LABELS = Object.fromEntries(MEAL_TYPES.map(({ value, label }) => [value, label]));
