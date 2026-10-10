import { getAuthToken } from './authSession.js';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(message, { status = 0, details, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const unauthorizedListeners = new Set();

/** Subscribes to 401 responses on authenticated requests. Returns an unsubscribe function. */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
    }
  }
  return url;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

function toApiError(response, payload) {
  const error = payload?.error;
  const firstDetail = error?.details?.[0]?.message;
  return new ApiError(firstDetail ?? error?.message ?? `Request failed with status ${response.status}`, {
    status: response.status,
    details: error?.details,
  });
}

async function request(
  path,
  { method = 'GET', body, query, headers, signal, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  );
  const forwardAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const token = auth ? getAuthToken() : null;

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const payload = await parseBody(response);

    if (!response.ok) {
      const apiError = toApiError(response, payload);
      if (response.status === 401 && token) {
        unauthorizedListeners.forEach((listener) => listener(apiError));
      }
      throw apiError;
    }

    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Caller-initiated cancellation is re-thrown untouched so callers can ignore it.
    if (signal?.aborted) throw err;
    if (err?.name === 'TimeoutError') {
      throw new ApiError('The server took too long to respond', { cause: err });
    }
    throw new ApiError('Unable to reach the server. Check your connection and API URL.', { cause: err });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
