import { useEffect, useState } from 'react';
import { healthApi } from '../api/healthApi.js';

const POLL_INTERVAL_MS = 30_000;

/** @returns {'checking' | 'online' | 'degraded' | 'offline'} */
export function useApiHealth() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let controller;

    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await healthApi.check({ signal: controller.signal });
        setStatus(res.status === 'ok' ? 'online' : 'degraded');
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus(err.status === 503 ? 'degraded' : 'offline');
      }
    };

    check();
    const intervalId = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
      controller?.abort();
    };
  }, []);

  return status;
}
