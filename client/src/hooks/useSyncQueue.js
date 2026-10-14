import { useEffect, useRef, useState } from 'react';
import { getQueuedRequests, subscribeQueue } from '../services/syncQueue.js';

/**
 * The signed-in user's offline queue: `items` still waiting to sync and `rejected` requests the
 * server refused this session. `onSynced(items)` runs whenever queued requests reach the server.
 */
export function useSyncQueue(userId, { onSynced } = {}) {
  const [items, setItems] = useState([]);
  const [rejected, setRejected] = useState([]);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    let heardEvent = false;
    const mine = (list) => list.filter((item) => item.userId === userId);
    const unsubscribe = subscribeQueue((event) => {
      heardEvent = true;
      setItems(mine(event.items));
      const rejectedNow = mine(event.rejected);
      if (rejectedNow.length > 0) setRejected((prev) => [...prev, ...rejectedNow]);
      const syncedNow = mine(event.synced);
      if (syncedNow.length > 0) onSyncedRef.current?.(syncedNow);
    });
    getQueuedRequests(userId).then((queued) => {
      if (!heardEvent) setItems(queued);
    });
    return () => {
      heardEvent = true;
      unsubscribe();
    };
  }, [userId]);

  return { items, rejected };
}
