export function stringToArrayBuffer(str: string) {
  let enc = new TextEncoder();
  return enc.encode(str);
}

export function arrayBufferToString(buf: ArrayBuffer): string {
  let dec = new TextDecoder();
  return dec.decode(buf);
}

export function arrayBufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToArrayBuffer(str: string): ArrayBuffer {
  let arr = [];
  if (str.length % 2 !== 0) {
    throw new Error('Hex string length should be divisible by 2');
  }
  for (let i = 0; i < str.length / 2; i++) {
    const byte = parseInt(str.slice(i * 2, i * 2 + 2), 16);
    arr.push(byte);
  }
  return new Uint8Array(arr);
}

export async function getcrypto() {
  // @ts-ignore
  if (typeof __isBrowser__ === 'undefined') {
    // @ts-ignore
    let crypto = await import('node:crypto');
    return crypto.webcrypto as unknown as Crypto;
  } else {
    return crypto;
  }
}
