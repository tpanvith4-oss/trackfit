import { useEffect, useState } from 'react';
import { healthApi } from '../api/healthApi.js';

const POLL_INTERVAL_MS = 5_000;
const WAKING_STATUSES = new Set([0, 408, 502, 503, 504]);

/** @returns {'checking' | 'waking' | 'online' | 'degraded' | 'offline'} */
export function useApiHealth() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let consecutiveFailures = 0;

    const check = async ({ wake = false } = {}) => {
      if (cancelled || inFlight) return;
      inFlight = true;

      try {
        const result = await healthApi.wake();
        if (cancelled) return;
        consecutiveFailures = 0;
        setStatus(result.online ? 'online' : 'degraded');
      } catch (err) {
        if (cancelled) return;
        consecutiveFailures += 1;
        const code = err?.status ?? 0;

        // Cold-start / gateway blips: keep trying without flipping to hard offline yet.
        if (WAKING_STATUSES.has(code) || wake || consecutiveFailures < 3) {
          setStatus((prev) => (prev === 'online' ? 'online' : 'waking'));
        } else if (code === 503) {
          setStatus('degraded');
        } else {
          setStatus('offline');
        }
      } finally {
        inFlight = false;
      }
    };

    // Immediate wake on app open (login + every other screen that mounts App).
    check({ wake: true });

    const intervalId = setInterval(() => check(), POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') check({ wake: true });
    };
    const onFocus = () => check({ wake: true });
    const onOnline = () => check({ wake: true });

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return status;
}
