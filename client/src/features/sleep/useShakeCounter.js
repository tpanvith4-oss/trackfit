import { useEffect, useState } from 'react';

const GRAVITY = 9.81;
const SHAKE_THRESHOLD = 11;
const MIN_GAP_MS = 250;
const SENSOR_TIMEOUT_MS = 2_500;

/**
 * Counts vigorous shakes from the accelerometer. `sensorAvailable` turns false when no
 * usable motion data arrives (desktops, permission denied) so callers can fall back.
 */
export function useShakeCounter(active) {
  const [count, setCount] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(() => (typeof DeviceMotionEvent === 'undefined' ? false : null));

  useEffect(() => {
    if (!active || typeof DeviceMotionEvent === 'undefined') return undefined;
    let lastShakeAt = 0;
    let receivedData = false;

    const onMotion = (event) => {
      const a = event.accelerationIncludingGravity;
      if (a?.x == null || a?.y == null || a?.z == null) return;
      if (!receivedData) {
        receivedData = true;
        setSensorAvailable(true);
      }
      const force = Math.abs(Math.hypot(a.x, a.y, a.z) - GRAVITY);
      const now = Date.now();
      if (force > SHAKE_THRESHOLD && now - lastShakeAt > MIN_GAP_MS) {
        lastShakeAt = now;
        setCount((value) => value + 1);
      }
    };

    window.addEventListener('devicemotion', onMotion);
    const timeoutId = setTimeout(() => !receivedData && setSensorAvailable(false), SENSOR_TIMEOUT_MS);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      clearTimeout(timeoutId);
    };
  }, [active]);

  return { count, sensorAvailable };
}
