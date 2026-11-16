import { Capacitor } from '@capacitor/core';
import { LiveActivity } from '@hassankbrian/capacitor-live-activity';

const ACTIVITY_ID = 'trackfit-rest-timer';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export async function startRestLiveActivity({ seconds, exerciseName }) {
  if (Capacitor.getPlatform() !== 'ios') return false;
  try {
    const available = await LiveActivity.isAvailable();
    if (!available) return false;
    await LiveActivity.startOrUpdateActivity({
      id: ACTIVITY_ID,
      attributes: {
        type: 'rest-timer',
        exercise: exerciseName ?? 'Rest',
      },
      contentState: {
        title: 'Rest',
        status: formatClock(seconds),
        message: exerciseName ? `Next: ${exerciseName}` : 'Break between sets',
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateRestLiveActivity(secondsLeft) {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await LiveActivity.updateActivity({
      id: ACTIVITY_ID,
      contentState: {
        title: 'Rest',
        status: formatClock(secondsLeft),
        message: secondsLeft > 0 ? 'Recovering…' : 'Ready',
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch {
    // Widget Extension may not be configured yet.
  }
}

export async function endRestLiveActivity() {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await LiveActivity.endActivity({
      id: ACTIVITY_ID,
      contentState: {
        title: 'Rest',
        status: '0:00',
        message: 'Ready for next set',
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch {
    // Ignore missing / already-ended activities.
  }
}
