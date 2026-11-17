import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { endRestLiveActivity, startRestLiveActivity, updateRestLiveActivity } from './restLiveActivity.js';

const REST_NOTIF_ID = 8201;
const CHANNEL_ID = 'trackfit-rest-timer-v1';

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
    // No custom ringtone — OS default alert + vibration when the app is backgrounded.
    sound: undefined,
    lights: true,
    lightColor: '#34D399',
  }).catch((error) => {
    channelReady = null;
    throw error;
  });
  return channelReady;
}

async function ensurePermission() {
  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

/** Schedules an exact-ish rest-end notification that can alert while the app is backgrounded. */
export async function startBackgroundRestTimer({ seconds, exerciseName }) {
  const safeSeconds = Math.max(1, Math.ceil(seconds));
  const endsAt = Date.now() + safeSeconds * 1000;

  // Best-effort Dynamic Island / Lock Screen (needs Widget Extension on iOS).
  const island = await startRestLiveActivity({ seconds: safeSeconds, exerciseName });

  let notificationScheduled = false;
  if (isNativeRestTimerSupported()) {
    try {
      const allowed = await ensurePermission();
      if (allowed) {
        await ensureRestChannel();
        await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
        await LocalNotifications.schedule({
          notifications: [
            {
              id: REST_NOTIF_ID,
              title: 'Rest over',
              body: exerciseName ? `Next set · ${exerciseName}` : 'Time for your next set',
              schedule: { at: new Date(endsAt), allowWhileIdle: true },
              channelId: CHANNEL_ID,
              // iOS needs a sound key for reliable background delivery; device may still vibrate.
              sound: 'default',
              extra: { type: 'rest-timer', exerciseName: exerciseName ?? '' },
            },
          ],
        });
        notificationScheduled = true;
      }
    } catch {
      notificationScheduled = false;
    }
  }

  return { endsAt, island, notificationScheduled };
}

export async function cancelBackgroundRestTimer() {
  try {
    if (isNativeRestTimerSupported()) {
      await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
    }
  } catch {
    // ignore
  }
  await endRestLiveActivity();
}

export async function tickBackgroundRestTimer(secondsLeft, { exerciseName } = {}) {
  await updateRestLiveActivity(secondsLeft, { exerciseName });
}

export function isRestNotification(notification) {
  return notification?.id === REST_NOTIF_ID || notification?.extra?.type === 'rest-timer';
}

export { REST_NOTIF_ID };
