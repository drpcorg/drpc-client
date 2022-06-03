let fetchFn: typeof globalThis.fetch;

export function getFetch() {
  if (fetchFn) {
    return fetchFn;
  }
  if (globalThis.fetch as any) {
    fetchFn = globalThis.fetch;
  } else {
    fetchFn = require('node-fetch') as unknown as typeof globalThis.fetch;
  }
  return fetchFn;
}
