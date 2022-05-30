import { provider, RpcState, validateResponse } from '../src/api';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  Response as DrpcResponse,
  Request as DrpcRequest,
  ProviderResponse,
} from 'dproxy/ts/protocol';

const default_request = {
  api_key: '',
  id: 'test',
  provider_ids: ['test1', 'test2', 'test3'],
  provider_num: 1,
  rpc: [
    {
      id: 'rtest1',
      jsonrpc: '2.0',
      method: 'eth_test',
      nonce: 1,
      params: [],
    },
  ],
};

const default_provider_response = {
  id: 'test',
  provider_id: 'test1',
  rpc_data: [
    {
      id: 'rtest1',
      error: '',
      nonce: 1,
      ok: true,
      payload: 'test_result',
      signature: '',
    },
  ],
};

function createProviderRespone(
  data: Partial<ProviderResponse> = {}
): ProviderResponse {
  return { ...default_provider_response, ...data };
}

const default_response = {
  id: 'test',
  responses: [
    {
      result: createProviderRespone(),
    },
  ],
};

function createRequest(data: Partial<DrpcRequest> = {}): DrpcRequest {
  return { ...default_request, ...data };
}

function createResponse(data: Partial<DrpcResponse> = {}): DrpcResponse {
  return { ...default_response, ...data };
}

type CaseBehavior =
  | {
      kind: 'correct';
    }
  | { kind: 'throws'; error: any };

const CORRECT: CaseBehavior = { kind: 'correct' };
const THROWS: (err: any) => CaseBehavior = (err: any) => ({
  kind: 'throws',
  error: err,
});

const requestResponsePairs: {
  [key: string]: [DrpcRequest, DrpcResponse, CaseBehavior];
} = {
  'single correct response': [createRequest(), createResponse(), CORRECT],
  'incorrect response id': [
    createRequest({ id: 'test1' }),
    createResponse({ id: 'test2' }),
    THROWS(Error),
  ],
};

describe('Drpc Api', () => {
  afterEach(() => {
    sinon.reset();
  });
  describe('fn#provider', () => {
    it('creates rpc state from settings', () => {
      sinon.stub(Math, 'random').returns(0);
      expect(
        provider({
          api_key: 'test',
          url: 'test',
          provider_ids: ['test'],
        })
      ).to.eq({
        api_key: 'test',
        nextId: 0,
        nextNonce: 0,
        provider_ids: ['test'],
        nextReqId: 0,
        provider_num: 1,
        url: 'test',
      } as RpcState);
    });
  });

  describe('fn#validateResponse', () => {
    Object.entries(requestResponsePairs).forEach(([key, value]) => {
      it(key, () => {
        const behav = value[2];
        switch (behav.kind) {
          case 'correct':
            expect(validateResponse(value[0], value[1])).to.eq(
              value[1].responses[0].result
            );
            break;
          case 'throws':
            expect(() => {
              validateResponse(value[0], value[1]);
            }).to.throw(behav.error);
            break;
        }
      });
    });
  });
});
