import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Values are stored as JSON. Builds before this service wrote some values (the JWT) as raw
 * strings, so anything that isn't JSON is read back as the string it is.
 */
function decode(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const webBackend = {
  read: (key) => window.localStorage.getItem(key),
  write: (key, raw) => window.localStorage.setItem(key, raw),
  remove: (key) => window.localStorage.removeItem(key),
};

function readLegacyWebValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeLegacyWebValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to migrate from when the WebView has no storage.
  }
}

/**
 * Android SharedPreferences, which the OS doesn't clear the way it can clear WebView storage.
 * Earlier APKs kept everything in WebView localStorage; those values move over on first read,
 * and writes drop the old copy so a removed value can't be resurrected from it.
 */
const nativeBackend = {
  async read(key) {
    const { value } = await Preferences.get({ key });
    if (value !== null) return value;
    const legacy = readLegacyWebValue(key);
    if (legacy === null) return null;
    await Preferences.set({ key, value: legacy });
    removeLegacyWebValue(key);
    return legacy;
  },
  async write(key, raw) {
    await Preferences.set({ key, value: raw });
    removeLegacyWebValue(key);
  },
  async remove(key) {
    await Preferences.remove({ key });
    removeLegacyWebValue(key);
  },
};

const backend = Capacitor.isNativePlatform() ? nativeBackend : webBackend;

// Holds values the backend refused (private mode, full quota) so the session still works until reload.
const unsaved = new Map();

// One operation at a time, so a read never overtakes an earlier write to the same key.
let queue = Promise.resolve();
function enqueue(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

/**
 * Persistent key/value storage: Capacitor Preferences on Android, localStorage on the web and PWA.
 * Every method resolves (never rejects); reads fall back to `fallback` when a key is missing or unreadable.
 */
export const storage = {
  get(key, fallback = null) {
    return enqueue(async () => {
      if (unsaved.has(key)) return decode(unsaved.get(key)) ?? fallback;
      try {
        return decode(await backend.read(key)) ?? fallback;
      } catch {
        return fallback;
      }
    });
  },

  /** Stores any JSON-serialisable value; `null` or `undefined` removes the key. */
  set(key, value) {
    if (value === null || value === undefined) return storage.remove(key);
    let raw;
    try {
      raw = JSON.stringify(value);
    } catch {
      return Promise.resolve();
    }
    return enqueue(async () => {
      try {
        await backend.write(key, raw);
        unsaved.delete(key);
      } catch {
        unsaved.set(key, raw);
      }
    });
  },

  remove(key) {
    return enqueue(async () => {
      unsaved.delete(key);
      try {
        await backend.remove(key);
      } catch {
        // A key the backend can't remove can't be read back either.
      }
    });
  },
};

const memorySession = new Map();

function sessionArea() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Synchronous scratch storage for data that should survive a reload but not closing the tab,
 * such as unsent form drafts. Falls back to memory when sessionStorage is unavailable.
 */
export const sessionStorageWrapper = {
  get(key, fallback = null) {
    if (memorySession.has(key)) return decode(memorySession.get(key)) ?? fallback;
    try {
      return decode(sessionArea()?.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    if (value === null || value === undefined) {
      sessionStorageWrapper.remove(key);
      return;
    }
    let raw;
    try {
      raw = JSON.stringify(value);
    } catch {
      return;
    }
    try {
      sessionArea().setItem(key, raw);
      memorySession.delete(key);
    } catch {
      memorySession.set(key, raw);
    }
  },

  remove(key) {
    memorySession.delete(key);
    try {
      sessionArea()?.removeItem(key);
    } catch {
      // Already gone from memory, which is all a broken sessionStorage could hold.
    }
  },
};
