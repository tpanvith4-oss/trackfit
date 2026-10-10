import { apiClient } from './apiClient.js';

export const toSchedulePayload = ({ targetWakeTime, targetSleepHours, latencyMinutes, enableCognitiveAlarm, alarmChallengeType }) => ({
  targetWakeTime,
  targetSleepHours,
  latencyMinutes,
  enableCognitiveAlarm,
  alarmChallengeType,
});

export const sleepApi = {
  getSchedule: (options) => apiClient.get('/api/sleep/schedule', options).then((res) => res.data),
  saveSchedule: (schedule) => apiClient.put('/api/sleep/schedule', toSchedulePayload(schedule)).then((res) => res.data),
};
