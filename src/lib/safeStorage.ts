/**
 * localStorage access that can never crash a render.
 *
 * `window.localStorage` is not always usable: Safari private mode, a sandboxed
 * iframe, a browser with third-party storage blocked, or a full quota can all
 * make *reading* throw a SecurityError — not just writing. Reading it directly
 * inside a `useState` initializer therefore turned "storage is disabled" into a
 * blank application-error screen. Every read/write in the app goes through here
 * so a blocked storage device still runs, it just does not remember anything.
 */

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const candidate = window.localStorage;
    // Touching a getter can throw in some embedded contexts.
    return candidate ?? null;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored (quota, private mode). */
export function safeSetItem(key: string, value: string): boolean {
  try {
    const target = storage();
    if (!target) return false;
    target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to do: the key simply stays.
  }
}

/** Reads and parses JSON, returning the fallback for corrupt or missing data. */
export function safeGetJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function safeSetJson(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
