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
function asn1derToIee(buf: ArrayBuffer) {
  let ubuf = new Uint8Array(buf);
  // check if this ASN.1 DER
  if (ubuf[0] !== 48 || ubuf[2] !== 2) {
    return ubuf;
  }

  const rlen_index = 3;
  const rlen = ubuf[3];
  const r = removeZeros(
    ubuf.slice(rlen_index + 1, ubuf[rlen_index] + rlen_index + 1)
  );
  const slen_index = ubuf[rlen_index] + rlen_index + 2;
  const s = removeZeros(
    ubuf.slice(slen_index + 1, slen_index + ubuf[slen_index] + 1)
  );
  var mergedArray = new Uint8Array(r.length + s.length);
  mergedArray.set(r);
  mergedArray.set(s, r.length);
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
