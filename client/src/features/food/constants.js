export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Dinner' },
];

export const DAILY_TARGETS = Object.freeze({
  calories: 1800,
  proteinG: 135,
});

export const getDailyTargets = (user) => ({
  calories: user?.dailyCalories ?? DAILY_TARGETS.calories,
  proteinG: user?.dailyProtein ?? DAILY_TARGETS.proteinG,
});

export const QUICK_STAPLES = [
  { id: 'protein-oats', name: 'Protein Oats + Whey', mealType: 'BREAKFAST', calories: 500, proteinG: 40, carbsG: 55, fatG: 12 },
  { id: 'rice-sambar-curd', name: 'Rice + Sambar + Curd', mealType: 'LUNCH', calories: 480, proteinG: 18, carbsG: 80, fatG: 8 },
  { id: 'soya-chunks', name: 'Soya Chunks 50g', mealType: 'SNACK', calories: 180, proteinG: 26, carbsG: 15, fatG: 1 },
  { id: 'chicken-rice', name: 'Chicken Breast + Rice', mealType: 'DINNER', calories: 500, proteinG: 42, carbsG: 50, fatG: 10 },
  { id: 'social', name: 'Out-of-Syllabus / Social', mealType: 'DINNER', calories: 800, proteinG: 25, carbsG: 90, fatG: 35 },
];
