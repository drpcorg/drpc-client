import { arrayBufferToHex, getcrypto, stringToArrayBuffer } from './util';

export async function sha256(data: string): Promise<string> {
  const crypto = await getcrypto();
  let digest = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(data));
  return arrayBufferToHex(digest);
}
