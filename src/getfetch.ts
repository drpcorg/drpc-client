export function getFetch() {
  let fetchFn: typeof globalThis.fetch;
  if (globalThis.fetch as any) {
    fetchFn = globalThis.fetch;
  } else {
    fetchFn = require('node-fetch') as unknown as typeof globalThis.fetch;
  }
  return fetchFn;
}
