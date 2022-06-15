import type {
  JSONRPCRequest,
  ProtocolError,
  ProviderResponse,
  Request as DrpcRequest,
  Response as DrpcResponse,
  HTTPResponse,
} from 'drpc-proxy';
import { CheckerT, createCheckers } from 'ts-interface-checker';
import suite from 'drpc-proxy/protocol-ti';
import { getFetch } from './getfetch';
import { initNonce } from './utils';
import { checkSignatures } from './signatures';

let { HTTPResponse } = createCheckers(
  // @ts-ignore
  suite.default ? suite.default : suite
) as {
  HTTPResponse: CheckerT<HTTPResponse>;
};

/**
 * Type describing provider state
 */
export type RpcState = {
  url: string;
  nextNonce: number;
  nextId: number;
  timeout: number;
  nextReqId: number;
  provider_ids: string[];
  provider_num: number;
  network: string;
  api_key: string;
  fetchOpt?: typeof getFetch;
};

/**
 * Type describing provider settings
 */
export type ProviderSettings = {
  url: string;
  provider_ids: string[];
  provider_num?: number;
  timeout?: number;
  api_key: string;
  network?: string;
};

/**
 * Simple JSON rpc request type
 */
export type JSONRpc = {
  method: string;
  params: any[];
  id?: number;
};

function createRequestItem(
  id: string,
  nonce: number,
  method: string,
  params: any[]
): JSONRPCRequest {
  return {
    id: id,
    nonce,
    jsonrpc: '2.0',
    method,
    params,
  };
}

/**
 * This error is thrown when we couldn't find a consensus between different providers
 * on a given request
 */
export class ConsensusError extends Error {
  readonly errors: ProtocolError[];
  constructor(msg: string, errors: ProtocolError[]) {
    super(`Consensus failure: ${msg}, response is not trustworthy`);
    this.errors = errors;
  }
}

function prepareResponsesForCheck(resp: ProviderResponse): {
  [id: string]: any;
} {
  let data: {
    [id: string]: any;
  } = {};
  if (resp.rpc_data) {
    for (let t of resp.rpc_data) {
      data[t.id] = t.payload;
    }
  }
  return data;
}

function collectMaxEqual(presps: ProviderResponse[]): ProviderResponse[] {
  let mp: Map<string, ProviderResponse[]> = new Map();
  for (let resp of presps) {
    const v = JSON.stringify(prepareResponsesForCheck(resp));
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

/**
 * Checks provider consensus client-side. For now, consensus is when >= 2n/3 providers agreed on all checks, where n is a total number of providers
 * - filters providers that returned errors
 * - finds the set biggest set of providers, that agreed on a given request response data
 * - filters providers that incorrectly signed data
 * - returns random data provider response that is a part of consensus
 */
export async function validateResponse(
  request: DrpcRequest,
  dresponse: DrpcResponse
): Promise<ProviderResponse> {
  if (dresponse.id !== request.id) {
    throw new Error('Response id and request id are not equal');
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

  let verified = await checkSignatures(equaled, request);
  if (!hasConsensus(verified, request.provider_num)) {
    throw new ConsensusError(
      `only ${verified.length} providers correctly signed response`,
      []
    );
  }

  return verified.pop() as ProviderResponse;
}

async function execute(
  request: DrpcRequest,
  url: string,
  timeout: number,
  fetchOpt?: typeof getFetch
): Promise<ProviderResponse> {
  let fetch = fetchOpt ? fetchOpt() : getFetch();
  let timeoutRef: any = 0;
  let controller = new AbortController();
  let timeoutP: Promise<any> = new Promise((res, rej) => {
    timeoutRef = setTimeout(() => {
      controller.abort();
      rej(new Error(`Request exceeded timeout of ${timeout}`));
    }, timeout);
  });
  let response: any;
  response = await Promise.race([
    timeoutP,
    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      method: 'POST',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(request),
    }),
  ]);
  clearTimeout(timeoutRef);
  let dresponse = await response.json();
  if (!HTTPResponse.test(dresponse)) {
    HTTPResponse.check(dresponse);
    throw new Error('Impossible, statement above always throws');
  }
  if (dresponse.error) {
    throw new Error(dresponse.error.message);
  }
  return validateResponse(request, dresponse.result as DrpcResponse);
}

function nonce(state: RpcState) {
  return ++state.nextNonce;
}

export function id(state: RpcState) {
  return ++state.nextId;
}

function reqid(state: RpcState) {
  return ++state.nextReqId;
}

/**
 * Makes JSON RPC batch request using state provided
 *
 * @param rpcs list of JSON RPC requests
 * @param state current provider state
 * @returns result of given RPC requests
 */
export async function makeRequestMulti(
  rpcs: JSONRpc[],
  state: RpcState,
  fetchOpt?: typeof getFetch
): Promise<any[]> {
  let preqs = rpcs.map((rpc) =>
    createRequestItem(
      (rpc.id ? rpc.id : id(state)).toString(),
      nonce(state),
      rpc.method,
      rpc.params
    )
  );
  const request: DrpcRequest = {
    id: reqid(state).toString(),
    provider_ids: state.provider_ids,
    provider_num: state.provider_num,
    rpc: preqs,
    api_key: state.api_key,
    network: state.network,
  };
  let response = await execute(
    request,
    state.url,
    state.timeout,
    state.fetchOpt
  );
  return (
    response.rpc_data?.map((el) => {
      if (el.ok) {
        return {
          jsonrpc: '2.0',
          id: el.id,
          result: el.payload,
        };
      } else {
        return {
          jsonrpc: '2.0',
          id: el.id,
          error: {
            code: 0,
            message: el.error,
          },
        };
      }
    }) ?? []
  );
}

/**
 * Makes JSON RPC request using state provided
 *
 * @param rpc JSON RPC requests
 * @param state current provider state
 * @returns result of given RPC request
 */
export async function makeRequest(rpc: JSONRpc, state: RpcState) {
  let responses = await makeRequestMulti([rpc], state);
  return responses[0];
}

/**
 * Creates new state for drpc client
 *
 * @param settings DRPC client settings
 * @returns
 */
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
    timeout: settings.timeout || 5000,
    network: settings.network || 'homestead',
  };
}

/**
 *
 * @param provider_num number of providers in consensus
 * @param state current provider state
 * @returns
 */
export function providerWithConsensus(
  provider_num: number,
  state: RpcState
): RpcState {
  return provider({ ...state, provider_num });
}
