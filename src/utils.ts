export function initNonce(): number {
  return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER / 2));
}
