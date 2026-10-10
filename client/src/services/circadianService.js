export const SLEEP_CYCLE_MINUTES = 90;
export const DEFAULT_LATENCY_MINUTES = 15;
export const IDEAL_CYCLES = 5;
export const RECOMMENDED_CYCLES = [IDEAL_CYCLES, 6];

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const wrapMinutes = (minutes) => ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

export const isClockTime = (value) => typeof value === 'string' && CLOCK_TIME_PATTERN.test(value);

/** "06:30" -> 390 (minutes after midnight). */
export function parseClockTime(value) {
  const match = CLOCK_TIME_PATTERN.exec(value ?? '');
  if (!match) throw new RangeError(`Expected a 24-hour HH:mm time, received "${value}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 1365 -> "22:45". Values outside a single day wrap around midnight. */
export function formatClockTime(minutes) {
  const wrapped = wrapMinutes(minutes);
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** "22:45" (or 1365) -> "10:45 PM". */
export function formatClockLabel(value) {
  const minutes = typeof value === 'number' ? wrapMinutes(value) : parseClockTime(value);
  const hours = Math.floor(minutes / 60);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** Time to get into bed so that `sleepHours` of sleep, after `latencyMinutes` to drift off, ends at the wake time. */
export function getBedtimeFor(targetWakeTime, sleepHours, latencyMinutes = DEFAULT_LATENCY_MINUTES) {
  return formatClockTime(parseClockTime(targetWakeTime) - sleepHours * 60 - latencyMinutes);
}

/**
 * Bedtimes that let you wake at the end of a full 90-minute cycle rather than mid-cycle.
 * For a 06:30 wake-up with 15 min latency: 5 cycles -> 22:45 (ideal), 6 cycles -> 21:15.
 */
export function calculateBedtimes(targetWakeTime, { latencyMinutes = DEFAULT_LATENCY_MINUTES, cycles = RECOMMENDED_CYCLES } = {}) {
  return cycles.map((count) => {
    const sleepHours = (count * SLEEP_CYCLE_MINUTES) / 60;
    const bedtime = getBedtimeFor(targetWakeTime, sleepHours, latencyMinutes);
    return {
      cycles: count,
      sleepHours,
      bedtime,
      label: formatClockLabel(bedtime),
      isIdeal: count === IDEAL_CYCLES,
    };
  });
}

const WIND_DOWN_STEPS = [
  {
    id: 'caffeine',
    offsetMinutes: 10 * 60,
    title: 'Caffeine cutoff',
    description: 'Last coffee, tea or pre-workout. Caffeine’s ~5 h half-life keeps blocking sleep pressure well into the night.',
  },
  {
    id: 'digestion',
    offsetMinutes: 3 * 60,
    title: 'Last heavy meal',
    description: 'Finish big meals now so digestion isn’t holding your resting heart rate up overnight.',
  },
  {
    id: 'cooldown',
    offsetMinutes: 90,
    title: 'Hot shower & cool room',
    description: 'A warm shower, then a cool (~18 °C) room, drives the core-temperature drop that signals sleep.',
  },
  {
    id: 'screens',
    offsetMinutes: 30,
    title: 'Blue light off & wind down',
    description: 'Night filter on, screens away. Switch to a cognitive shuffle or brown noise.',
  },
];

/** Wind-down checkpoints counted back from bedtime, in chronological order. */
export function getWindDownTimeline(targetBedtime) {
  const bedtime = parseClockTime(targetBedtime);
  return WIND_DOWN_STEPS.map((step) => {
    const time = formatClockTime(bedtime - step.offsetMinutes);
    return { ...step, time, label: formatClockLabel(time) };
  });
}

/** Most recent moment (<= `now`) the clock showed `clockTime`. */
export function getLatestOccurrence(clockTime, now = new Date()) {
  const minutes = parseClockTime(clockTime);
  const occurrence = new Date(now);
  occurrence.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  if (occurrence > now) occurrence.setDate(occurrence.getDate() - 1);
  return occurrence;
}

/** Next moment (> `now`) the clock will show `clockTime`. */
export function getNextOccurrence(clockTime, now = new Date()) {
  const occurrence = getLatestOccurrence(clockTime, now);
  occurrence.setDate(occurrence.getDate() + 1);
  return occurrence;
}

/**
 * Anchors the schedule to real dates for the night leading into the next wake-up,
 * so steps earlier today read as done and the upcoming one can show a countdown.
 */
export function buildNightPlan({ targetWakeTime, targetSleepHours, latencyMinutes }, now = new Date()) {
  const wakeAt = getNextOccurrence(targetWakeTime, now);
  const bedtime = getBedtimeFor(targetWakeTime, targetSleepHours, latencyMinutes);
  const bedtimeAt = new Date(wakeAt.getTime() - (targetSleepHours * 60 + latencyMinutes) * MS_PER_MINUTE);

  let nextFound = false;
  const steps = [
    ...getWindDownTimeline(bedtime).map((step) => ({
      ...step,
      at: new Date(bedtimeAt.getTime() - step.offsetMinutes * MS_PER_MINUTE),
    })),
    {
      id: 'bedtime',
      offsetMinutes: 0,
      title: 'In bed, lights out',
      description: `Aim to be asleep ${latencyMinutes} min later for ${targetSleepHours} h of sleep.`,
      time: bedtime,
      label: formatClockLabel(bedtime),
      at: bedtimeAt,
    },
  ].map((step) => {
    const isDone = step.at <= now;
    const isNext = !isDone && !nextFound;
    if (isNext) nextFound = true;
    return { ...step, status: isDone ? 'done' : isNext ? 'next' : 'upcoming' };
  });

  return { bedtime, bedtimeAt, wakeAt, steps };
}

/** 7_800_000 -> "2 h 10 min"; anything under a minute reads "<1 min". */
export function formatDuration(ms) {
  const totalMinutes = Math.floor(Math.max(0, ms) / MS_PER_MINUTE);
  if (totalMinutes < 1) return '<1 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
