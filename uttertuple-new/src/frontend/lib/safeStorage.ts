/**
 * Safe storage abstraction for localStorage.
 * Works around Node.js 25's broken localStorage proxy (getItem is undefined when
 * --localstorage-file is not set) and provides no-op for SSR where window is undefined.
 * Use this instead of direct localStorage access for code that may run in Node/SSR.
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage ?? window.localStorage;
  if (!ls || typeof ls.getItem !== 'function') return null;
  return ls;
}

const storage = getStorage();

export const safeStorage = {
  getItem: (key: string): string | null => storage?.getItem(key) ?? null,
  setItem: (key: string, value: string): void => {
    storage?.setItem(key, value);
  },
  removeItem: (key: string): void => {
    storage?.removeItem(key);
  },
  clear: (): void => {
    storage?.clear();
  },
  get length(): number {
    return storage?.length ?? 0;
  },
  key: (index: number): string | null => storage?.key(index) ?? null,
};
