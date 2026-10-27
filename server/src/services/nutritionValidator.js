const HIGH_CARB_NAME = /biryani|biriyani|rice|palav|pulao|idli|dosa|obbattu|holige|mudde|chapati|thali/i;

/**
 * Atwater macro check + rice/carb guardrail for food logging.
 * Pure function — does not touch the database.
 */
export function validateNutrition({
  name,
  calories,
  proteinG = 0,
  carbsG = 0,
  fatG = 0,
  addedOilMl = 0,
  diaasScore = 1.0,
  forceOverride = false,
} = {}) {
  const protein = Number(proteinG) || 0;
  const carbs = Number(carbsG) || 0;
  let fat = Number(fatG) || 0;
  const oilMl = Math.max(0, Number(addedOilMl) || 0);
  const diaas = Number(diaasScore) > 0 ? Number(diaasScore) : 1.0;
  const loggedCalories = Math.max(0, Math.round(Number(calories) || 0));

  let oilFatG = 0;
  let oilCalories = 0;
  if (oilMl > 0) {
    oilFatG = oilMl * 0.9;
    oilCalories = Math.round(oilFatG * 9);
    fat += oilFatG;
  }

  const atwaterCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const discrepancyPct = (Math.abs(loggedCalories - atwaterCalories) / Math.max(loggedCalories, 1)) * 100;
  const isMacroVerified = discrepancyPct <= 12;
  const effectiveProteinG = Number((protein * diaas).toFixed(1));

  let warning = null;
  if (!forceOverride && HIGH_CARB_NAME.test(String(name ?? '')) && carbs < 10) {
    warning = `High-carb dish logged with <10g carbs. Suggested calories: ${atwaterCalories}`;
  }

  return {
    atwaterCalories,
    discrepancyPct: Number(discrepancyPct.toFixed(1)),
    isMacroVerified,
    effectiveProteinG,
    fatG: Number(fat.toFixed(1)),
    oilFatG: Number(oilFatG.toFixed(1)),
    oilCalories,
    warning,
  };
}

/** Apply Atwater-derived fields onto a food create/update payload. */
export function enrichFoodMacros(payload) {
  const result = validateNutrition(payload);
  return {
    ...payload,
    fatG: payload.addedOilMl > 0 ? result.fatG : payload.fatG,
    atwaterCalories: result.atwaterCalories,
    isMacroVerified: result.isMacroVerified,
    effectiveProteinG: result.effectiveProteinG,
    _nutrition: result,
  };
}
