export const CUT_PROTOCOL = Object.freeze({
  baselineKg: 64.0,
  targetMinKg: 58.0,
  targetMaxKg: 60.0,
});

export const getCutProtocol = (user) => ({
  baselineKg: user?.baselineWeight ?? CUT_PROTOCOL.baselineKg,
  targetMinKg: user?.targetWeightMin ?? CUT_PROTOCOL.targetMinKg,
  targetMaxKg: user?.targetWeightMax ?? CUT_PROTOCOL.targetMaxKg,
});

export const ROLLING_WINDOW_DAYS = 7;
export const MIN_ENTRIES_FOR_RATE = 4;

export const QUICK_ADJUSTMENTS_KG = [-0.2, -0.1, 0, 0.1, 0.2];

export const RATE_STATUS = Object.freeze({
  COLLECTING: {
    id: 'collecting',
    label: 'Collecting Data (need 4+ logs)',
    description: 'Log at least 4 weigh-ins over the last two weeks to unlock your weekly rate.',
    tone: 'subtle',
  },
  NEEDS_PRIOR_WEEK: {
    id: 'needs-prior-week',
    label: 'Collecting Data (need 8+ days of logs)',
    description: 'The weekly rate compares this week with days 8–14, so keep logging into next week.',
    tone: 'subtle',
  },
  DROPPING_FAST: {
    id: 'dropping-fast',
    label: 'Dropping Fast (>0.7 kg/wk) - Watch Muscle Loss',
    description: 'Losing faster than the protocol allows. Check protein intake and consider a small calorie increase.',
    tone: 'amber',
  },
  SLIGHTLY_FAST: {
    id: 'slightly-fast',
    label: 'Slightly Fast (0.6–0.7 kg/wk)',
    description: 'Just above the target band. Fine for a week; watch for a trend.',
    tone: 'amber',
  },
  TARGET: {
    id: 'target',
    label: 'Target Rate (0.4–0.6 kg/wk)',
    description: 'Right in the pocket. Hold calories and protein steady.',
    tone: 'emerald',
  },
  SLOW_LOSS: {
    id: 'slow-loss',
    label: 'Slow Loss (0.2–0.4 kg/wk)',
    description: 'Moving in the right direction, but below the target band.',
    tone: 'sky',
  },
  STABLE: {
    id: 'stable',
    label: 'Maintenance / Stable',
    description: 'Weekly average is flat or rising.',
    tone: 'slate',
  },
});
