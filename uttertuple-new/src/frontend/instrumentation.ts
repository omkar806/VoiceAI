/**
 * Patches Node.js 25's broken localStorage proxy.
 * When --localstorage-file is not provided, Node 25 creates a proxy that returns
 * undefined for all property access (including getItem), causing "getItem is not a function".
 * This runs at server startup and replaces it with a no-op implementation for SSR.
 * @see https://github.com/nodejs/node/issues/60303
 */
export async function register() {
  if (typeof globalThis === 'undefined') return;

  const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!ls || typeof ls.getItem !== 'function') {
    const noop: Storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      get length() {
        return 0;
      },
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage = noop;
  }
}
