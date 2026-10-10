import { useEffect } from 'react';

/** Keeps the screen on while `active`. Browsers drop the lock when the app is hidden, so it is re-acquired on return. */
export function useScreenWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
        else sentinel = lock;
      } catch {
        sentinel = null;
      }
    };

    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
