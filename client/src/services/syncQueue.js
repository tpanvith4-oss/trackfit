import { apiClient } from '../api/apiClient.js';
import { loadSession } from '../api/authSession.js';
import { createId } from '../utils/id.js';
import { storage } from './storageService.js';

export const QUEUE_KEY = 'OFFLINE_SYNC_QUEUE';
export const RETRY_DELAY_MS = 30_000;
// Render holds requests while a sleeping instance boots (up to about a minute).
const REQUEST_TIMEOUT_MS = 70_000;

/**
 * @typedef {{ id: string, userId: string, endpoint: string, method: string, payload: unknown,
 *   timestamp: number, retries: number }} QueuedRequest
 * @typedef {{ items: QueuedRequest[], synced: QueuedRequest[], rejected: (QueuedRequest & { error: string })[] }} QueueEvent
 */

/** Failures worth retrying later: no response at all (offline, timeout, CORS while booting) or a server error. */
export const isRetryableError = (error) => {
  const status = error?.status ?? 0;
  return status === 0 || status === 408 || status === 429 || status >= 500;
};

const isQueuedRequest = (item) =>
  Boolean(item) && typeof item === 'object' && typeof item.id === 'string' && typeof item.userId === 'string' && typeof item.endpoint === 'string';

async function readQueue() {
  const items = await storage.get(QUEUE_KEY, []);
  return Array.isArray(items) ? items.filter(isQueuedRequest) : [];
}

const listeners = new Set();

/** @param {(event: QueueEvent) => void} listener @returns {() => void} unsubscribe */
export function subscribeQueue(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let mutationChain = Promise.resolve();

/** Read-modify-write steps run one at a time, so an enqueue and a removal can't overwrite each other. */
function updateQueue(change, { synced = [], rejected = [] } = {}) {
  const run = mutationChain.then(async () => {
    const items = change(await readQueue());
    await storage.set(QUEUE_KEY, items);
    return items;
  });
  mutationChain = run.catch(() => {});
  return run.then((items) => {
    listeners.forEach((listener) => listener({ items, synced, rejected }));
    return items;
  });
}

/** @param {string} userId @returns {Promise<QueuedRequest[]>} */
export async function getQueuedRequests(userId) {
  return (await readQueue()).filter((item) => item.userId === userId);
}

let retryTimer = null;

function scheduleRetry(delayMs = RETRY_DELAY_MS) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    processQueue();
  }, delayMs);
}

export function cancelScheduledRetry() {
  clearTimeout(retryTimer);
  retryTimer = null;
}

/**
 * Stores a request to replay once the backend is reachable, under the signed-in account so
 * it is never sent with someone else's token. Retries are scheduled automatically.
 * @returns {Promise<QueuedRequest>}
 */
export async function enqueueRequest(endpoint, method, payload) {
  const session = await loadSession();
  if (!session) throw new Error('Sign in again to save changes offline');
  const item = {
    id: createId(),
    userId: session.user.id,
    endpoint,
    method: method.toUpperCase(),
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  await updateQueue((items) => [...items, item]);
  scheduleRetry();
  return item;
}

export function removeQueuedRequest(id) {
  return updateQueue((items) => items.filter((item) => item.id !== id));
}

async function drain(signal) {
  cancelScheduledRetry();
  if (navigator.onLine === false) return;
  const session = await loadSession();
  if (!session) return;

  // Re-read every round so requests queued or removed meanwhile are picked up.
  while (!signal.aborted) {
    const [item] = await getQueuedRequests(session.user.id);
    if (!item) return;

    try {
      await apiClient.request(item.endpoint, {
        method: item.method,
        body: item.payload,
        // The stored token is attached explicitly so a request always runs as the account that queued it.
        auth: false,
        headers: { Authorization: `Bearer ${session.token}` },
        timeoutMs: REQUEST_TIMEOUT_MS,
        signal,
      });
      await updateQueue((items) => items.filter((queued) => queued.id !== item.id), { synced: [item] });
    } catch (error) {
      if (signal.aborted) return;
      if (isRetryableError(error)) {
        await updateQueue((items) => items.map((queued) => (queued.id === item.id ? { ...queued, retries: queued.retries + 1 } : queued)));
        scheduleRetry();
        return;
      }
      // Expired or revoked session: keep everything until the user signs in again.
      if (error?.status === 401 || error?.status === 403) return;
      // Any other 4xx will fail the same way every time, so drop it rather than block the queue.
      await updateQueue((items) => items.filter((queued) => queued.id !== item.id), {
        rejected: [{ ...item, error: error?.message ?? 'Rejected by the server' }],
      });
    }
  }
}

let processing = null;
let processingController = null;

/**
 * Replays the signed-in user's queued requests in order. Stops at the first retryable failure
 * and tries again in 30 seconds; calls made while a run is in progress share that run.
 *
 * Pass `restart` when connectivity has just changed (back online, app resumed): a request
 * started before that may be stuck on a dead connection until its 70 s timeout, so it is
 * abandoned and the run starts over. Replays are idempotent, so resending is safe.
 */
export function processQueue({ restart = false } = {}) {
  if (processing && restart) {
    processingController.abort();
    return processing.then(() => processQueue());
  }
  if (!processing) {
    const controller = new AbortController();
    processingController = controller;
    processing = drain(controller.signal)
      .catch(() => scheduleRetry())
      .finally(() => {
        processing = null;
      });
  }
  return processing;
}
