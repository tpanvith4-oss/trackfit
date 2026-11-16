import { API_BASE_URL, ApiError, apiClient } from './apiClient.js';

// Allow a sleeping Render instance to finish waking (proxy can take up to ~1 min).
const HEALTH_TIMEOUT_MS = 70_000;

async function fetchHealth(path, { signal, timeoutMs = HEALTH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  );
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new ApiError(`Health check failed (${response.status})`, { status: response.status });
    }
    return { ok: true, statusCode: response.status, payload };
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err instanceof ApiError) throw err;
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new ApiError('The server took too long to respond', { cause: err, status: 408 });
    }
    throw new ApiError('Unable to reach the server', { cause: err, status: 0 });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function isOkPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return payload.status === 'ok' || payload.ok === true || payload.success === true;
}

/**
 * Hits both liveness URLs. Succeeds if either returns 200 + ok payload.
 * Used as a Render cold-start wake + status probe.
 */
export async function wakeBackend(options = {}) {
  const errors = [];

  for (const path of ['/health', '/api/health']) {
    try {
      const result = await fetchHealth(path, options);
      if (isOkPayload(result.payload) || result.statusCode === 200) {
        return { online: true, path, payload: result.payload };
      }
    } catch (err) {
      errors.push(err);
    }
  }

  // Last resort through the shared client (same base URL / headers as the rest of the app).
  try {
    const payload = await apiClient.get('/api/health', {
      timeoutMs: HEALTH_TIMEOUT_MS,
      auth: false,
      ...options,
    });
    if (isOkPayload(payload)) return { online: true, path: '/api/health', payload };
  } catch (err) {
    errors.push(err);
  }

  const last = errors[errors.length - 1];
  throw last ?? new ApiError('Unable to reach the server', { status: 0 });
}

export const healthApi = {
  check: (options) => wakeBackend(options),
  wake: (options) => wakeBackend(options),
};
