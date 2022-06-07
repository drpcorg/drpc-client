import {
  JSONRPCResponse,
  ProviderResponse,
  Request as DrpcRequest,
} from 'drpc-proxy';
import PUBLIC_KEYS from './keys';
import { sha256 } from './isocrypto/hashes';
import { checkSha256 } from './isocrypto/signatures';

const DSHACKLE_PREFIX = 'DSHACKLESIG';

async function prepareMessage(
  jsonrpc: JSONRPCResponse,
  nonce: number
): Promise<string> {
  const hash = await sha256(JSON.stringify(jsonrpc.payload));
  return `${DSHACKLE_PREFIX}/${nonce}/${jsonrpc.upstream_id}/${hash}`;
}

export async function checkSignatures(
  presps: ProviderResponse[],
  request: DrpcRequest
): Promise<ProviderResponse[]> {
  const filtered = [];
  const noncemap = request.rpc.reduce((acc, el) => {
    acc[el.id] = el.nonce;
    return acc;
  }, {} as { [t: string]: number });
  for (let resp of presps) {
    const rpcdata = resp.rpc_data;
    if (!rpcdata) {
      continue;
    }
    let results = rpcdata.map(async (el) => {
      if (!noncemap[el.id]) {
        return false;
      }
      const prepared = await prepareMessage(el, noncemap[el.id]);
      if (!el.signature) {
        return false;
      }
      if (!PUBLIC_KEYS[resp.provider_id]) {
        console.warn(`Do not have public key for ${resp.provider_id} provider`);
        return false;
      }
      return checkSha256(prepared, el.signature, PUBLIC_KEYS[resp.provider_id]);
    });
    let validation = await Promise.all(results);
    if (validation.every((el) => el)) {
      filtered.push(resp);
    }
  }
  return filtered;
}
