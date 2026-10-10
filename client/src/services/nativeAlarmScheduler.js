import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** How long an unanswered alarm keeps repeating, natively and in-app. */
export const ALARM_RING_WINDOW_MS = 30 * 60_000;
const REPEAT_EVERY_MS = 2 * 60_000;
const NOTIFICATIONS_PER_SERIES = 1 + ALARM_RING_WINDOW_MS / REPEAT_EVERY_MS;

/** Upcoming wake-ups armed ahead, so the alarm keeps working on days the app isn't opened. */
export const NATIVE_DAYS_AHEAD = 7;
// One series per armed day, plus the unanswered alarm still repeating and a pending snooze.
const MAX_SERIES = NATIVE_DAYS_AHEAD + 2;
const ID_BASE = 7100;
const ALL_IDS = Array.from({ length: MAX_SERIES * NOTIFICATIONS_PER_SERIES }, (_, i) => ({ id: ID_BASE + i }));

// Android freezes a channel's sound and importance once created; change the id to change them.
const CHANNEL_ID = 'trackfit-wake-alarm-v1';
const GROUP = 'trackfit-wake-alarm';

export const isNativeAlarmSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');

const normalizePermission = (state) => (state?.startsWith('prompt') ? 'prompt' : (state ?? 'prompt'));

/**
 * @returns {Promise<{ notifications: 'granted' | 'denied' | 'prompt', exactAlarms: 'granted' | 'denied' }>}
 */
export async function getNativeAlarmPermissions() {
  const { display } = await LocalNotifications.checkPermissions();
  let exactAlarms = 'granted';
  try {
    const { exact_alarm: exact } = await LocalNotifications.checkExactNotificationSetting();
    exactAlarms = exact === 'granted' ? 'granted' : 'denied';
  } catch {
    // Not implemented before Android 12, where every alarm is exact.
  }
  return { notifications: normalizePermission(display), exactAlarms };
}

export async function requestNativeAlarmPermissions() {
  await LocalNotifications.requestPermissions();
  return getNativeAlarmPermissions();
}

/** Opens Android's "Alarms & reminders" screen for TrackFit. */
export async function openExactAlarmSettings() {
  await LocalNotifications.changeExactNotificationSetting();
  return getNativeAlarmPermissions();
}

let channelReady = null;
function ensureChannel() {
  channelReady ??= LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Wake-up alarm',
    description: 'Rings at your wake time and repeats until you solve the challenge in TrackFit.',
    importance: 5,
    visibility: 1,
    sound: 'trackfit_alarm.wav',
    vibration: true,
    lights: true,
    lightColor: '#FBBF24',
  }).catch((error) => {
    channelReady = null;
    throw error;
  });
  return channelReady;
}

const COPY = {
  wake: { title: 'Time to wake up', body: 'Open TrackFit and solve the challenge to stop the alarm.' },
  snooze: { title: 'Snooze is over', body: 'Open TrackFit and solve the challenge to get up.' },
  repeat: { title: 'Still in bed?', body: 'The alarm repeats every 2 minutes until you solve the challenge in TrackFit.' },
};

function expandSeries({ startsAt, kind }, slot, now) {
  const notifications = [];
  for (let i = 0; i < NOTIFICATIONS_PER_SERIES; i += 1) {
    const at = startsAt + i * REPEAT_EVERY_MS;
    if (at <= now) continue;
    notifications.push({
      id: ID_BASE + slot * NOTIFICATIONS_PER_SERIES + i,
      ...(i === 0 ? COPY[kind] : COPY.repeat),
      channelId: CHANNEL_ID,
      group: GROUP,
      autoCancel: true,
      schedule: { at: new Date(at), allowWhileIdle: true },
      extra: { trackfitAlarm: kind, startsAt },
    });
  }
  return notifications;
}

let syncChain = Promise.resolve();
let syncedSignature = null;

/**
 * Replaces every pending TrackFit alarm notification with `series`. Each series rings at
 * `startsAt` and repeats until the ring window closes. Calls run one at a time, and a call
 * whose series match the last successful one is skipped.
 * @param {{ startsAt: number, kind: 'wake' | 'snooze' }[]} series
 */
export function syncNativeAlarms(series) {
  if (!isNativeAlarmSupported()) return Promise.resolve();
  const signature = JSON.stringify(series);

  const run = async () => {
    if (signature === syncedSignature) return;
    syncedSignature = null;
    await ensureChannel();
    await LocalNotifications.cancel({ notifications: ALL_IDS });
    const now = Date.now();
    const notifications = series.slice(0, MAX_SERIES).flatMap((entry, slot) => expandSeries(entry, slot, now));
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    syncedSignature = signature;
  };

  syncChain = syncChain.catch(() => {}).then(run);
  return syncChain;
}
