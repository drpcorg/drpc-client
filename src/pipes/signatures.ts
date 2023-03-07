import {
  JSONRPCResponse,
  ReplyItem,
  Request as DrpcRequest,
} from '@drpcorg/drpc-proxy';
import PUBLIC_KEYS, { DrpcProviders } from '../keys';
import { sha256 } from '../isocrypto/hashes';
import { checkSha256 } from '../isocrypto/signatures';
import { Observable, ObservableLike, filter } from 'observable-fns';

const DSHACKLE_PREFIX = 'DSHACKLESIG';

async function prepareMessage(
  jsonrpc: JSONRPCResponse,
  nonce: number
): Promise<string> {
  const hash = await sha256(JSON.stringify(jsonrpc.payload));
  return `${DSHACKLE_PREFIX}/${nonce}/${jsonrpc.upstream_id}/${hash}`;
}

export function checkSignatures(request: DrpcRequest) {
  const noncemap = request.rpc.reduce((acc, el) => {
    acc[el.id] = el.nonce;
    return acc;
  }, {} as { [t: string]: number });
  return filter<ReplyItem, ReplyItem>(async (item) => {
    let data = item.result;
    if (!data) {
      throw new Error("Can't check signatures on failure");
    }
    if (!item.id || !noncemap[item.id]) {
      return false;
    }
    const prepared = await prepareMessage(data, noncemap[data.id]);
    // TODO: sign errors too
    if (!data.ok) {
      return true;
    }
    if (!data.signature) {
      console.warn(
        `Response is not an error, but is not signed, this is probably a misconfiguration`,
        data
      );
      return false;
    }
    if (!PUBLIC_KEYS[item.provider_id as DrpcProviders]) {
      console.warn(`Do not have public key for ${item.provider_id} provider`);
      return false;
    }
    return checkSha256(
      prepared,
      data.signature,
      PUBLIC_KEYS[item.provider_id as DrpcProviders]
    );
  });
}
