import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityApi } from '../../api/activityApi.js';
import { checkinsApi } from '../../api/checkinsApi.js';
import { foodApi } from '../../api/foodApi.js';
import { measurementsApi } from '../../api/measurementsApi.js';
import { weightApi } from '../../api/weightApi.js';
import { workoutsApi } from '../../api/workoutsApi.js';
import { CUT_MILESTONES, VACUUM_TARGET_SETS, WATER_TARGET_ML } from '../../constants/cutProtocol.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDailyTargets } from '../food/constants.js';
import { addDays, dayKey, startOfToday } from '../../utils/date.js';

const DAYS_WINDOW = 14;
const SHORT_DATE_FMT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function formatDayShort(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    label: SHORT_DATE_FMT.format(dt),
    weekday: SHORT_WEEKDAY_FMT.format(dt),
  };
}

function buildDateWindow(days = DAYS_WINDOW) {
  const today = startOfToday();
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dt = addDays(today, -i);
    keys.push(dayKey(dt));
  }
  return keys;
}

function buildSampleDataset(targets) {
  const keys = buildDateWindow(DAYS_WINDOW);
  const calTarget = targets.calories || 1650;
  const pTarget = targets.proteinG || 145;
  const cTarget = targets.carbsG || 160;
  const fTarget = targets.fatG || 48;

  const daily = keys.map((date, idx) => {
    const wave = Math.sin(idx * 0.72) * 0.11 + Math.cos(idx * 0.41) * 0.06;
    const isTrainingDay = idx % 7 !== 0;
    const calories = Math.round(calTarget * (0.94 + wave + (isTrainingDay ? 0.04 : -0.06)));
    const proteinG = Math.round(pTarget * (0.93 + Math.cos(idx * 0.55) * 0.09));
    const fatG = Math.round(fTarget * (0.92 + Math.sin(idx * 0.9) * 0.14));
    const carbsG = Math.max(45, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
    const activeCalories = isTrainingDay ? Math.round(440 + Math.sin(idx * 0.85) * 120) : Math.round(240 + idx * 4);
    const steps = isTrainingDay ? 9800 + Math.round(Math.sin(idx * 0.9) * 1800) : 7100;
    const waterMl = Math.round(WATER_TARGET_ML * (0.85 + (idx % 3) * 0.08));
    const creatineTaken = idx !== 4;
    const vacuumSets = Math.min(VACUUM_TARGET_SETS, 3 + (idx % 3));
    const soyaRinsed = idx % 2 === 0;
    const habitScore = Math.round(
      ((Math.min(1, waterMl / WATER_TARGET_ML) +
        (creatineTaken ? 1 : 0) +
        Math.min(1, vacuumSets / VACUUM_TARGET_SETS) +
        (soyaRinsed ? 1 : 0)) /
        4) *
        100,
    );
    const { label, weekday } = formatDayShort(date);
    return {
      date,
      label,
      weekday,
      calories,
      proteinG,
      carbsG,
      fatG,
      activeCalories,
      steps,
      mealCount: 4,
      habitScore,
      waterMl,
      creatineTaken,
      vacuumSets,
      soyaRinsed,
      netCalories: calories - activeCalories,
      calorieTarget: calTarget,
      proteinTarget: pTarget,
      carbsTarget: cTarget,
      fatTarget: fTarget,
    };
  });

  const trajectoryPoints = CUT_MILESTONES.map((m, idx) => {
    const hasActual = idx <= 5;
    const actualWeight = hasActual ? Number((m.weightKg + Math.sin(idx * 1.1) * 0.25 - 0.12).toFixed(2)) : null;
    const actualWaist = hasActual ? Number((m.waistCm + Math.cos(idx * 0.9) * 0.35 - 0.18).toFixed(1)) : null;
    const actualBf = hasActual ? Number((m.bfPct - 0.15 + Math.sin(idx) * 0.2).toFixed(1)) : null;
    return {
      week: m.week,
      date: m.date,
      targetWeightKg: m.weightKg,
      targetWaistCm: m.waistCm,
      targetBfPct: m.bfPct,
      actualWeightKg: actualWeight,
      actualWaistCm: actualWaist,
      actualBfPct: actualBf,
    };
  });

  const today = daily[daily.length - 1];
  const activeRecovery = [
    { muscle: 'Chest', status: 'READY', hoursSince: 54 },
    { muscle: 'Back', status: 'READY', hoursSince: 48 },
    { muscle: 'Quads', status: 'RECOVERING', hoursSince: 22 },
    { muscle: 'Core', status: 'READY', hoursSince: 38 },
    { muscle: 'Shoulders', status: 'READY', hoursSince: 54 },
    { muscle: 'Hamstrings', status: 'READY', hoursSince: 64 },
  ];

  return computeAnalyticsSummary({
    daily,
    today,
    targets,
    trajectoryPoints,
    latestMeasurement: {
      weightKg: trajectoryPoints[5].actualWeightKg,
      waistUmbilicalCm: trajectoryPoints[5].actualWaistCm,
      estimatedBfPct: trajectoryPoints[5].actualBfPct,
      leanMassKg: 49.9,
      whtr: 0.481,
    },
    currentWeek: 5,
    recoveryList: activeRecovery,
    hasLiveData: false,
  });
}

function computeAnalyticsSummary({
  daily,
  today,
  targets,
  trajectoryPoints,
  latestMeasurement,
  currentWeek,
  recoveryList,
  hasLiveData,
}) {
  const loggedDays = daily.filter((d) => d.calories > 0);
  const last7 = daily.slice(-7);
  const last7Logged = last7.filter((d) => d.calories > 0);
  const avg = (arr, fn) => (arr.length ? arr.reduce((s, item) => s + fn(item), 0) / arr.length : 0);

  const avgCalories7d = Math.round(avg(last7Logged.length ? last7Logged : last7, (d) => d.calories));
  const avgProtein7d = Math.round(avg(last7Logged.length ? last7Logged : last7, (d) => d.proteinG));
  const avgActiveBurn7d = Math.round(avg(last7, (d) => d.activeCalories));
  const avgNetBalance7d = avgCalories7d - avgActiveBurn7d;
  const proteinAdherencePct = targets.proteinG
    ? Math.min(130, Math.round((avgProtein7d / targets.proteinG) * 100))
    : 0;
  const avgHabitScore = Math.round(avg(last7, (d) => d.habitScore));

  const readyCount = recoveryList.filter((m) => m.status === 'READY').length;
  const recoveryPct = recoveryList.length ? Math.round((readyCount / recoveryList.length) * 100) : 100;

  const macroKcal = {
    protein: (today?.proteinG || 0) * 4,
    carbs: (today?.carbsG || 0) * 4,
    fat: (today?.fatG || 0) * 9,
  };

  return {
    daily,
    today: today ?? daily[daily.length - 1],
    targets,
    trajectoryPoints,
    latestMeasurement,
    currentWeek,
    recoveryList,
    hasLiveData,
    kpis: {
      loggedDaysCount: loggedDays.length,
      avgCalories7d,
      avgProtein7d,
      avgActiveBurn7d,
      avgNetBalance7d,
      proteinAdherencePct,
      avgHabitScore,
      recoveryPct,
      macroKcal,
    },
  };
}

export function useAnalyticsData() {
  const { user } = useAuth();
  const targets = useMemo(() => getDailyTargets(user), [user]);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataMode, setDataMode] = useState('auto'); // 'auto' | 'live' | 'sample'
  const [reloadNonce, setReloadNonce] = useState(0);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let active = true;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      const keys = buildDateWindow(DAYS_WINDOW);
      const startKey = keys[0];
      const endKey = keys[keys.length - 1];
      const startDateIso = `${startKey}T00:00:00.000Z`;
      const endDateIso = `${endKey}T23:59:59.999Z`;

      const settled = await Promise.allSettled([
        foodApi.getFoodLogsRange(startKey, endKey, 500, { signal }),
        checkinsApi.energy({ days: DAYS_WINDOW }, { signal }),
        weightApi.list({ limit: 40 }, { signal }),
        measurementsApi.trajectory({ signal }),
        measurementsApi.list({ signal }),
        activityApi.list({ startDate: startDateIso, endDate: endDateIso }, { signal }),
        workoutsApi.recovery({ signal }),
      ]);

      if (!active || signal.aborted) return;

      const unwrap = (res) => (res.status === 'fulfilled' ? res.value : null);
      const foodRange = unwrap(settled[0]);
      const energy = unwrap(settled[1]);
      const weights = unwrap(settled[2]);
      const trajectory = unwrap(settled[3]);
      const measurements = unwrap(settled[4]);
      const activities = unwrap(settled[5]);
      const recovery = unwrap(settled[6]);

      const allFailed = settled.every((r) => r.status === 'rejected');
      if (allFailed) {
        setError(settled[0].reason ?? new Error('Unable to load analytics data.'));
      }

      setRaw({
        keys,
        foodEntries: foodRange?.data ?? (Array.isArray(foodRange) ? foodRange : []),
        energyDays: energy?.days ?? [],
        weights: Array.isArray(weights) ? weights : [],
        trajectory,
        measurements: Array.isArray(measurements) ? measurements : [],
        activities: Array.isArray(activities) ? activities : [],
        recovery,
      });
      setLoading(false);
    }

    fetchAll();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadNonce]);

  const liveSummary = useMemo(() => {
    const keys = raw?.keys ?? buildDateWindow(DAYS_WINDOW);
    const foodByDay = new Map();
    for (const entry of raw?.foodEntries ?? []) {
      const k = dayKey(entry.loggedAt ?? entry.createdAt ?? new Date());
      const bucket = foodByDay.get(k) ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };
      bucket.calories += Number(entry.calories) || 0;
      bucket.proteinG += Number(entry.proteinG) || 0;
      bucket.carbsG += Number(entry.carbsG) || 0;
      bucket.fatG += Number(entry.fatG) || 0;
      bucket.count += 1;
      foodByDay.set(k, bucket);
    }

    const energyByDay = new Map((raw?.energyDays ?? []).map((d) => [d.date, d]));
    const stepsByDay = new Map();
    for (const act of raw?.activities ?? []) {
      const k = dayKey(act.syncDay ?? act.date ?? new Date());
      stepsByDay.set(k, (stepsByDay.get(k) ?? 0) + (Number(act.steps) || 0));
    }

    const daily = keys.map((date) => {
      const food = foodByDay.get(date) ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };
      const energyDay = energyByDay.get(date);
      const checkin = energyDay?.checkin ?? null;
      const calories = Math.round(food.calories || energyDay?.calories || 0);
      const proteinG = Number((food.proteinG || energyDay?.proteinG || 0).toFixed(1));
      const carbsG = Number(food.carbsG.toFixed(1));
      const fatG = Number(food.fatG.toFixed(1));
      const activeCalories = Math.round(energyDay?.activeCalories || 0);
      const waterMl = Number(checkin?.waterMl) || 0;
      const creatineTaken = Boolean(checkin?.creatineTaken);
      const vacuumSets = Number(checkin?.vacuumSetsCompleted) || 0;
      const soyaRinsed = Boolean(checkin?.soyaTripleRinsed);
      const habitScore = Math.round(
        ((Math.min(1, waterMl / WATER_TARGET_ML) +
          (creatineTaken ? 1 : 0) +
          Math.min(1, vacuumSets / VACUUM_TARGET_SETS) +
          (soyaRinsed ? 1 : 0)) /
          4) *
          100,
      );
      const { label, weekday } = formatDayShort(date);
      return {
        date,
        label,
        weekday,
        calories,
        proteinG,
        carbsG,
        fatG,
        activeCalories,
        steps: stepsByDay.get(date) ?? 0,
        mealCount: food.count || energyDay?.foodCount || 0,
        habitScore,
        waterMl,
        creatineTaken,
        vacuumSets,
        soyaRinsed,
        netCalories: calories - activeCalories,
        calorieTarget: targets.calories,
        proteinTarget: targets.proteinG,
        carbsTarget: targets.carbsG,
        fatTarget: targets.fatG,
      };
    });

    const milestones = raw?.trajectory?.milestones ?? CUT_MILESTONES;
    const measurementsAsc = [...(raw?.measurements ?? [])].sort(
      (a, b) => new Date(a.loggedAt) - new Date(b.loggedAt),
    );
    const weightsAsc = [...(raw?.weights ?? [])].sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

    const trajectoryPoints = milestones.map((m, idx) => {
      const mTime = Date.parse(m.date);
      const matchedMeasurement = measurementsAsc.find(
        (item) => Math.abs(new Date(item.loggedAt).getTime() - mTime) <= 4 * 86_400_000,
      );
      const matchedWeight = weightsAsc.find(
        (item) => Math.abs(new Date(item.loggedAt).getTime() - mTime) <= 4 * 86_400_000,
      );
      // Fallback: map sequential actual logs to early weeks if user logged outside protocol calendar
      const fallbackMeasurement = !matchedMeasurement && idx < measurementsAsc.length ? measurementsAsc[idx] : null;
      const fallbackWeight = !matchedWeight && idx < weightsAsc.length ? weightsAsc[idx] : null;
      const meas = matchedMeasurement ?? fallbackMeasurement;
      const wt = matchedWeight ?? fallbackWeight;

      return {
        week: m.week,
        date: m.date,
        targetWeightKg: m.weightKg,
        targetWaistCm: m.waistCm,
        targetBfPct: m.bfPct,
        actualWeightKg: meas?.weightKg ?? wt?.weightKg ?? null,
        actualWaistCm: meas?.waistUmbilicalCm ?? null,
        actualBfPct: meas?.estimatedBfPct ?? null,
      };
    });

    const recoveryRaw = raw?.recovery;
    let recoveryList = [];
    if (Array.isArray(recoveryRaw)) {
      recoveryList = recoveryRaw.map((item) => ({
        muscle: item.muscleGroup ?? item.muscle ?? 'Muscle',
        status: item.status ?? 'READY',
        hoursSince: item.hoursSince ?? null,
      }));
    } else if (recoveryRaw && typeof recoveryRaw === 'object') {
      recoveryList = Object.entries(recoveryRaw)
        .filter(([, val]) => val && typeof val === 'object')
        .map(([muscle, val]) => ({
          muscle,
          status: val.status ?? 'READY',
          hoursSince: val.hoursSince ?? null,
        }));
    }

    const hasLiveData =
      daily.some((d) => d.calories > 0 || d.activeCalories > 0) ||
      measurementsAsc.length > 0 ||
      weightsAsc.length > 0;

    return computeAnalyticsSummary({
      daily,
      today: daily[daily.length - 1],
      targets,
      trajectoryPoints,
      latestMeasurement: raw?.trajectory?.latest ?? measurementsAsc[measurementsAsc.length - 1] ?? null,
      currentWeek: raw?.trajectory?.mesocycleWeek ?? 1,
      recoveryList,
      hasLiveData,
    });
  }, [raw, targets]);

  const sampleSummary = useMemo(() => buildSampleDataset(targets), [targets]);

  const effectiveMode = useMemo(() => {
    if (dataMode === 'live' || dataMode === 'sample') return dataMode;
    return liveSummary.hasLiveData ? 'live' : 'sample';
  }, [dataMode, liveSummary.hasLiveData]);

  const dataset = effectiveMode === 'live' ? liveSummary : sampleSummary;

  return {
    dataset,
    effectiveMode,
    hasLiveData: liveSummary.hasLiveData,
    loading,
    error,
    setDataMode,
    reload,
  };
}
