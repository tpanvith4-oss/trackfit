import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REST_NOTIF_ID = 1;
const CHANNEL_ID = 'trackfit-rest-timer-v2';

export const isNativeRestTimerSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');

let channelReady = null;

async function ensureRestChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  channelReady ??= LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Rest timer',
    description: 'Fires when your rest between sets is over.',
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: undefined,
    lights: true,
    lightColor: '#34D399',
  }).catch((error) => {
    channelReady = null;
    throw error;
  });
  return channelReady;
}

/** Ask for notification permission once (safe to call on mount). */
export async function requestRestNotificationPermission() {
  if (!isNativeRestTimerSupported()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule a silent rest-complete local notification at now + seconds.
 * Returns whether the notification was scheduled.
 */
export async function startBackgroundRestTimer({ seconds, exerciseName }) {
  const safeSeconds = Math.max(1, Math.ceil(seconds));
  if (!isNativeRestTimerSupported()) return { notificationScheduled: false };

  try {
    const allowed = await requestRestNotificationPermission();
    if (!allowed) return { notificationScheduled: false };

    await ensureRestChannel();
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_NOTIF_ID,
          title: 'Rest Complete',
          body: exerciseName ? `Time for your next set · ${exerciseName}` : "Time for your next set! Let's go.",
          schedule: { at: new Date(Date.now() + safeSeconds * 1000), allowWhileIdle: true },
          channelId: CHANNEL_ID,
          // Keep silent where the platform allows; device may still vibrate via channel/system settings.
          sound: null,
          extra: { type: 'rest-timer', exerciseName: exerciseName ?? '' },
        },
      ],
    });
    return { notificationScheduled: true };
  } catch {
    return { notificationScheduled: false };
  }
}

export async function cancelBackgroundRestTimer() {
  if (!isNativeRestTimerSupported()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
  } catch {
    // ignore
  }
}

export function isRestNotification(notification) {
  return notification?.id === REST_NOTIF_ID || notification?.extra?.type === 'rest-timer';
}

export { REST_NOTIF_ID };
