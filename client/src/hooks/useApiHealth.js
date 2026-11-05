import { useEffect, useState } from 'react';
import { healthApi } from '../api/healthApi.js';

const POLL_INTERVAL_MS = 30_000;

/** @returns {'checking' | 'online' | 'degraded' | 'offline'} */
export function useApiHealth() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let controller;
    let cancelled = false;

    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await healthApi.check({ signal: controller.signal });
        if (!cancelled) setStatus(res.status === 'ok' ? 'online' : 'degraded');
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        // 503 = API up but DB down; network/timeout/CORS → offline
        setStatus(err.status === 503 ? 'degraded' : 'offline');
      }
    };

    check();
    const intervalId = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      controller?.abort();
    };
  }, []);

  return status;
}
