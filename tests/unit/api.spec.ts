import {
  ConsensusError,
  JSONRpc,
  makeRequestMulti,
  provider,
  RpcState,
  validateResponse,
} from '../../src/api';
import { expect, use } from 'chai';
import chaip from 'chai-as-promised';
use(chaip);
import sinon from 'sinon';
import {
  Response as DrpcResponse,
  Request as DrpcRequest,
  ProviderResponse,
  JSONRPCResponse,
} from 'drpc-proxy';

const default_request = {
  api_key: '',
  id: '1',
  network: 'homestead',
  provider_ids: ['test1', 'test2', 'test3'],
  provider_num: 1,
  rpc: [
    {
      id: '1',
      jsonrpc: '2.0',
      method: 'eth_test',
      nonce: 1,
      params: [],
    },
  ],
};

const default_rpc_data = {
  error: '',
  id: '1',
  nonce: 1,
  signature: '1212',
  ok: true,
  payload: 'data1',
  upstream_id: 'test',
};

function createRpcData(data: Partial<JSONRPCResponse> = {}): JSONRPCResponse {
  return { ...default_rpc_data, ...data };
}

const default_provider_response = {
  id: '1',
  provider_id: 'test1',
  rpc_data: [createRpcData()],
};

function createProviderRespone(
  data: Partial<ProviderResponse> = {}
): ProviderResponse {
  return { ...default_provider_response, ...data };
}

const default_response = {
  id: '1',
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
    createRequest({ id: '1' }),
    createResponse({ id: '2' }),
    THROWS(Error),
  ],
  'not enough succeess for consensus': [
    createRequest({
      provider_ids: ['test1', 'test2', 'test3'],
      provider_num: 3,
    }),
    createResponse({
      responses: [
        { result: createProviderRespone({ id: 'test1' }) },
        { error: { code: 0, message: 'test' } },
        { error: { code: 0, message: 'test' } },
      ],
    }),
    THROWS(ConsensusError),
  ],
  'no consensus in response payload': [
    createRequest({
      provider_ids: ['test1', 'test2', 'test3'],
      provider_num: 3,
      rpc: [
        {
          id: '1',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 1,
          params: [],
        },
        {
          id: '2',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 2,
          params: [],
        },
      ],
    }),
    createResponse({
      responses: [
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data3' }),
            ],
          }),
        },
      ],
    }),
    THROWS(ConsensusError),
  ],
  'correct consensus from 3 responses': [
    createRequest({
      provider_ids: ['test1', 'test2', 'test3'],
      provider_num: 3,
      rpc: [
        {
          id: '1',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 1,
          params: [],
        },
        {
          id: '2',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 2,
          params: [],
        },
      ],
    }),
    createResponse({
      responses: [
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1', signature: '2' }),
              createRpcData({ id: '2', payload: 'data2', signature: '1' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
      ],
    }),
    CORRECT,
  ],
  'correct consensus from 4 responses with 1 error': [
    createRequest({
      provider_ids: ['test1', 'test2', 'test3', 'test4'],
      provider_num: 4,
      rpc: [
        {
          id: '1',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 1,
          params: [],
        },
        {
          id: '2',
          jsonrpc: '2.0',
          method: 'eth_test',
          nonce: 2,
          params: [],
        },
      ],
    }),
    createResponse({
      responses: [
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          result: createProviderRespone({
            rpc_data: [
              createRpcData({ id: '1', payload: 'data1' }),
              createRpcData({ id: '2', payload: 'data2' }),
            ],
          }),
        },
        {
          error: { code: 0, message: 'test' },
        },
      ],
    }),
    CORRECT,
  ],
};

jest.mock('../../src/isocrypto/signatures');
describe('Drpc Api', () => {
  afterEach(() => {
    sinon.restore();
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
      ).to.deep.equal({
        api_key: 'test',
        nextId: 0,
        timeout: 5000,
        nextNonce: 0,
        provider_ids: ['test'],
        nextReqId: 0,
        provider_num: 1,
        network: 'homestead',
        url: 'test',
      } as RpcState);
    });
  });

  describe('fn#validateResponse', () => {
    Object.entries(requestResponsePairs).forEach(([key, value]) => {
      it(key, async () => {
        const behav = value[2];
        switch (behav.kind) {
          case 'correct':
            expect(await validateResponse(value[0], value[1])).to.deep.equal(
              value[1].responses[0].result
            );
            break;
          case 'throws':
            await (
              expect(validateResponse(value[0], value[1])).to.be as any
            ).rejectedWith(behav.error);
            break;
        }
      });
    });
  });
  describe('fn#makeRequestMulti', () => {
    Object.entries(requestResponsePairs).forEach(([key, value]) => {
      it(key, async () => {
        const req: JSONRpc[] = value[0].rpc.map((el) => ({
          method: el.method,
          params: el.params,
        }));
        sinon.stub(Math, 'random').returns(0);
        const state = provider({
          api_key: '',
          provider_ids: value[0].provider_ids,
          url: '',
          provider_num: value[0].provider_num,
        });

        state.fetchOpt = function () {
          return function () {
            return Promise.resolve({
              json: () => ({ result: value[1] }),
            });
          };
        } as any;

        const behav = value[2];
        switch (behav.kind) {
          case 'correct':
            expect(await makeRequestMulti(req, state)).to.deep.equal(
              value[1].responses[0].result?.rpc_data?.map((el) => {
                return {
                  result: el.payload,
                  id: el.id,
                  jsonrpc: '2.0',
                };
              }) ?? []
            );
            break;
          case 'throws':
            await (
              expect(makeRequestMulti(req, state)).to.be as any
            ).rejectedWith(behav.error);
            break;
        }
        sinon.restore();
      });
    });
  });
});
