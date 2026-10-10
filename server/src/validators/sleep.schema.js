import { z } from 'zod';

export const ALARM_CHALLENGE_TYPES = ['math', 'shake'];

export const sleepScheduleSchema = z.object({
  targetWakeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Wake time must be in 24-hour HH:mm format'),
  targetSleepHours: z.number().min(3).max(12),
  latencyMinutes: z.number().int().min(0).max(120),
  enableCognitiveAlarm: z.boolean(),
  alarmChallengeType: z.enum(ALARM_CHALLENGE_TYPES),
});
