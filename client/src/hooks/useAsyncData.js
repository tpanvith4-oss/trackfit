import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `fetcher(signal)` on mount and whenever `deps` change, cancelling
 * in-flight requests on re-run/unmount. `setData` allows optimistic updates.
 */
export function useAsyncData(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [reloadToken, setReloadToken] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, error, loading: false }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...deps]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      })),
    [],
  );

  return { ...state, reload, setData };
}
