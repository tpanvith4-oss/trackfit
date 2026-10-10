import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` and whenever the app returns to the foreground. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const intervalId = setInterval(tick, intervalMs);
    const onVisibility = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return now;
}
