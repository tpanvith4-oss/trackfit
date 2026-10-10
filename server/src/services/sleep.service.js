import { prisma } from '../config/db.js';

export const SLEEP_SCHEDULE_DEFAULTS = Object.freeze({
  targetWakeTime: '06:30',
  targetSleepHours: 7.5,
  latencyMinutes: 15,
  enableCognitiveAlarm: true,
  alarmChallengeType: 'math',
});

const SCHEDULE_SELECT = {
  targetWakeTime: true,
  targetSleepHours: true,
  latencyMinutes: true,
  enableCognitiveAlarm: true,
  alarmChallengeType: true,
  updatedAt: true,
};

/** Returns the user's saved schedule, or the defaults (with `updatedAt: null`) if they never saved one. */
export async function getSleepSchedule(userId) {
  const schedule = await prisma.sleepSchedule.findUnique({ where: { userId }, select: SCHEDULE_SELECT });
  return schedule ?? { ...SLEEP_SCHEDULE_DEFAULTS, updatedAt: null };
}

export function saveSleepSchedule(userId, data) {
  return prisma.sleepSchedule.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
    select: SCHEDULE_SELECT,
  });
}
