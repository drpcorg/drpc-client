import type {
  JSONRPCRequest,
  Request as DrpcRequest,
  ReplyItem,
  HTTPResponse,
  JSONRPCResponse,
} from 'drpc-proxy';
import { CheckerT, createCheckers } from 'ts-interface-checker';
import suite from 'drpc-proxy/protocol-ti';
import { initNonce } from './utils';
import { Observable, map } from 'observable-fns';
import nodefetch from 'node-fetch';
import {
  requestFinalization,
  requestCompletness,
  requestTimeout,
} from './pipes/request';
import { checkSignatures } from './pipes/signatures';
import { consensus } from './pipes/consensus';
import { collect, shuffleArray } from './utils';

let { HTTPResponse } = createCheckers(
  // @ts-ignore
  suite.default ? suite.default : suite
) as {
  HTTPResponse: CheckerT<HTTPResponse>;
};

function getFetch(): typeof globalThis.fetch {
  return globalThis.fetch || nodefetch;
}

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
  dontShuffle: boolean;
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
  dontShuffle?: boolean;
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

function provider(settings: ProviderSettings): RpcState {
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
    dontShuffle: !!settings.dontShuffle,
  };
}

function selectProviders(state: RpcState): string[] {
  return shuffleArray(state.provider_ids).slice(0, state.provider_num);
}

abstract class Api {
  readonly state: RpcState;

  constructor(settings: ProviderSettings) {
    this.state = provider(settings);
  }

  protected nonce(): number {
    return ++this.state.nextNonce;
  }

  id(): number {
    return ++this.state.nextId;
  }

  protected reqid(): number {
    return ++this.state.nextReqId;
  }

  /**
   * Single JSON rpc call
   *
   * @param rpc JSON RPC request
   * @returns JSON RPC response
   */
  async call(rpc: JSONRpc): Promise<any> {
    let resp = await this.callMulti([rpc]);
    return resp[0];
  }

  /**
   * Batch JSON RPC request
   *
   * @param rpcs JSON RPC requests
   * @returns JSON RPC responses
   */
  async callMulti(rpcs: JSONRpc[]): Promise<any[]> {
    let preqs = rpcs.map((rpc) =>
      createRequestItem(
        (rpc.id ? rpc.id : this.id()).toString(),
        this.nonce(),
        rpc.method,
        rpc.params
      )
    );
    const request: DrpcRequest = {
      id: this.reqid().toString(),
      provider_ids: this.state.dontShuffle
        ? this.state.provider_ids
        : selectProviders(this.state),
      rpc: preqs,
      api_key: this.state.api_key,
      network: this.state.network,
    };

    let items = await collect(
      // TODO: timeouts
      this.send(request).pipe(
        requestFinalization(request),
        requestTimeout(this.state.timeout, 'request took too long to complete'),
        checkSignatures(request),
        map((item) => item.result as JSONRPCResponse),
        consensus(request.provider_ids.length),
        requestCompletness(request)
      )
    );

    return items.map((el) => {
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
    });
  }

  protected abstract send(rpcs: DrpcRequest): Observable<ReplyItem>;
}

/**
 * HTTP API provider
 */
export class HTTPApi extends Api {
  private async execute(
    controller: AbortController,
    request: DrpcRequest
  ): Promise<ReplyItem[]> {
    let response = await getFetch()(this.state.url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // @ts-ignore
      signal: controller.signal,
      method: 'POST',
      redirect: 'error',
      body: JSON.stringify(request),
    });

    let dresponse = await response.json();
    if (!HTTPResponse.test(dresponse)) {
      HTTPResponse.check(dresponse);
      throw new Error('Impossible, statement above always throws');
    }
    return dresponse.items;
  }

  protected send(request: DrpcRequest): Observable<ReplyItem> {
    let controller = new AbortController();

    return new Observable((observer) => {
      this.execute(controller, request)
        .then((response) => {
          response.forEach((resp) => observer.next(resp));
          observer.complete();
        })
        .catch((err) => observer.error(err));
      return () => {
        controller.abort();
      };
    });
  }
}
