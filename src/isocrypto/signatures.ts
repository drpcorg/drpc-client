import { hexToArrayBuffer, stringToArrayBuffer, getcrypto } from './util';

function removeZeros(s: Uint8Array): Uint8Array {
  let leadingZeros = 0;
  while (s[leadingZeros] === 0) {
    leadingZeros++;
  }
  return s.slice(leadingZeros);
}

/**
 * This converts ASN.1 DER signature format to plain r|s format.
 * Heavily relying on the specificity of encoding EC keys.
 */
export function asn1derToIee(buf: ArrayBuffer) {
  let ubuf = new Uint8Array(buf);
  // check if this ASN.1 DER
  // 48 is a standard first byte for ASN.1 (0x30)
  // 2 is a tag for integer
  // we expect signing ASN.1 scheme to always containt 2 integers
  if (ubuf[0] !== 48 || ubuf[2] !== 2) {
    return ubuf;
  }

  // start at index 3, aftex 0x30 and 0x2, this offset contains length of an integer
  const rlen_index = 3;
  // then read starting from 4th offset until 4 + length we obtained
  // ASN.1 adds padding, if first bit is 1, because it stores signed integers
  // r|s scheme stores unsigned intergers, so we remove the padding
  const r = removeZeros(
    ubuf.slice(rlen_index + 1, ubuf[rlen_index] + rlen_index + 1)
  );

  // then next byte should be 0x2 and then we expect another length
  const slen_index = ubuf[rlen_index] + rlen_index + 2;
  // reading the second integer and also remove the padding
  const s = removeZeros(
    ubuf.slice(slen_index + 1, slen_index + ubuf[slen_index] + 1)
  );

  // as r|s are just concats of 2 big integers, to know where to split they have to be the same size
  // otherwise the split can be wrong. ASN.1 due to its structure can store integers of different length
  // Thus, we need to pad one of the intergers to equalize length
  let maxlen = Math.max(r.length, s.length);
  var mergedArray = new Uint8Array(maxlen * 2);
  mergedArray.set(r, maxlen - r.length);
  mergedArray.set(s, r.length + maxlen - s.length);
  return mergedArray;
}

export async function checkSha256(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  const crypto = await getcrypto();
  const key = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(publicKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    key,
    asn1derToIee(hexToArrayBuffer(signature)),
    stringToArrayBuffer(data)
  );
}
