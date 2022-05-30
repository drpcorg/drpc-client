import type {
  JSONRPCRequest,
  ProtocolError,
  ProviderResponse,
  Request as DrpcRequest,
  Response as DrpcResponse,
} from 'dproxy/ts/protocol';
import { CheckerT, createCheckers } from 'ts-interface-checker';
import suite from 'dproxy/ts/protocol-ti.js';
import { getFetch } from './getfetch';
import { initNonce } from './utils';

let { Response: DrpcResponseChecker } = createCheckers(suite) as {
  Response: CheckerT<DrpcResponse>;
};

export type RpcState = {
  url: string;
  nextNonce: number;
  nextId: number;
  nextReqId: number;
  provider_ids: string[];
  provider_num: number;
  api_key: string;
  fetchOpt?: typeof getFetch;
};

export type ProviderSettings = {
  url: string;
  provider_ids: string[];
  provider_num?: number;
  api_key: string;
};

export type JSONRpc = {
  method: string;
  params: any[];
};

function creteRequestItem(
  id: number,
  nonce: number,
  method: string,
  params: any[]
): JSONRPCRequest {
  return {
    id: id.toString(),
    nonce,
    jsonrpc: '2.0',
    method,
    params,
  };
}

export class ConsensusError extends Error {
  readonly errors: ProtocolError[];
  constructor(msg: string, errors: ProtocolError[]) {
    super(`Consensus failure: ${msg}, response is not trustworthy`);
    this.errors = errors;
  }
}

function collectMaxEqual(presps: ProviderResponse[]): ProviderResponse[] {
  let mp: Map<string, ProviderResponse[]> = new Map();
  for (let resp of presps) {
    const v = JSON.stringify(resp.rpc_data);
    const curv = mp.get(v);
    if (curv) {
      mp.set(v, curv.concat([resp]));
    } else {
      mp.set(v, [resp]);
    }
  }
  let max_collection: ProviderResponse[] = [];
  for (let v of mp.values()) {
    if (v.length > max_collection.length) {
      max_collection = v;
    }
  }
  return max_collection;
}

function hasConsensus(collection: ProviderResponse[], total: number): boolean {
  return Math.floor((2 * total) / 3) + 1 <= collection.length;
}

export function validateResponse(
  request: DrpcRequest,
  dresponse: DrpcResponse
): ProviderResponse {
  if (dresponse.id !== request.id) {
    throw new ConsensusError('Response id and request id are not equal', []);
  }

  let succeed = dresponse.responses
    .filter((presp) => presp.result)
    .map((presp) => presp.result as ProviderResponse);
  if (!hasConsensus(succeed, request.provider_num)) {
    throw new ConsensusError(
      `${request.provider_num - succeed.length} of ${
        request.provider_num
      } providers returned errors`,
      dresponse.responses
        .filter((presp) => presp.error)
        .map((presp) => presp.error as ProtocolError)
    );
  }

  let equaled = collectMaxEqual(succeed);
  if (!hasConsensus(equaled, request.provider_num)) {
    throw new ConsensusError(`maximum ${equaled.length} providers agreed`, []);
  }
  //TODO: check signatures
  return equaled.pop() as ProviderResponse;
}

async function execute(
  request: DrpcRequest,
  url: string,
  fetchOpt?: typeof getFetch
): Promise<ProviderResponse> {
  let fetch = fetchOpt ? await fetchOpt() : await getFetch();
  let response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(request),
  });

  let dresponse = await response.json();
  if (!DrpcResponseChecker.test(dresponse)) {
    DrpcResponseChecker.check(dresponse);
    throw new Error('Impossible, statement above always throws');
  }

  return validateResponse(request, dresponse);
}

function nonce(state: RpcState) {
  return state.nextNonce++;
}

function id(state: RpcState) {
  return state.nextId++;
}

function reqid(state: RpcState) {
  return state.nextReqId++;
}

export async function makeRequestMulti(
  rpcs: JSONRpc[],
  state: RpcState,
  fetchOpt?: typeof getFetch
): Promise<ProviderResponse> {
  let preqs = rpcs.map((rpc) =>
    creteRequestItem(id(state), nonce(state), rpc.method, rpc.params)
  );
  const request: DrpcRequest = {
    id: reqid(state).toString(),
    provider_ids: state.provider_ids,
    provider_num: state.provider_num,
    rpc: preqs,
    api_key: state.api_key,
  };
  return execute(request, state.url, state.fetchOpt);
}

export async function makeRequest(rpc: JSONRpc, state: RpcState) {
  return makeRequestMulti([rpc], state);
}

export function provider(settings: ProviderSettings): RpcState {
  if (settings.provider_ids.length < (settings.provider_num || 1)) {
    throw new Error('Not enough provder_ids for provider_num');
  }
  return {
    api_key: settings.api_key,
    provider_ids: settings.provider_ids,
    provider_num: settings.provider_num || 1,
    nextId: initNonce(),
    nextNonce: initNonce(),
    nextReqId: initNonce(),
    url: settings.url,
  };
}

export function providerWithConsensus(
  provider_num: number,
  state: RpcState
): RpcState {
  return provider({ ...state, provider_num });
}
