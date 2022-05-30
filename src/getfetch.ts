let fetchFn: Promise<typeof globalThis.fetch> | undefined = undefined;

export function getFetch() {
  if (fetchFn) {
    return fetchFn;
  }
  if (globalThis.fetch as any) {
    fetchFn = Promise.resolve(globalThis.fetch);
  } else {
    fetchFn = import('node-fetch').then(
      (f) => f.default as typeof globalThis.fetch
    );
  }
  return fetchFn;
}
