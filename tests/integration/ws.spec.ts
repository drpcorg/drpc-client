import { JestExpect } from '@jest/expect';
import { WsApi } from '../../src/api';
import { initWsState, wrapIdGen } from '../integration-init';
import { WS } from 'jest-websocket-mock';
import { WebSocket } from 'mock-socket';
let fakeUrl = 'ws://localhost:1234';

declare var expect: JestExpect;

describe('Websocket API', () => {
  afterEach(() => {
    WS.clean();
  });

  it('tests single response', async () => {
    let api = wrapIdGen(() => new WsApi(initWsState({})));

    let res = api.call({
      method: 'eth_getBalance',
      params: ['0x175574c4a5e620fcf83672fa1c8680f41469d7f7', '0xff3b1d'],
    });

    expect(await res).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x20e6aba154fe",
}
`);
    await api.close();
  });

  it('timeouts', async () => {
    const server = new WS(fakeUrl + '/ws');

    let api = wrapIdGen(
      () =>
        new WsApi(
          initWsState({ url: fakeUrl, timeout: 1000 }),
          WebSocket as any
        )
    );

    await server.connected;

    return expect(
      api.call({
        method: 'eth_chainId',
        params: [],
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Timeout: request took too long to complete]`
    );
  });

  it('handles disconnect with error', async () => {
    const server = new WS(fakeUrl + '/ws');

    let api = wrapIdGen(
      () => new WsApi(initWsState({ url: fakeUrl }), WebSocket as any)
    );

    await server.connected;

    let result = api.call({
      method: 'eth_chainId',
      params: [],
    });

    server.error();

    return expect(result).rejects.toMatchInlineSnapshot(
      `[Error: Connection closed unexpectedly with error]`
    );
  });

  it('returns error when incorrect api token', async () => {
    let api = wrapIdGen(
      () =>
        new WsApi(
          initWsState({
            dkey: 'invalid',
          })
        )
    );

    let res = api.call({
      method: 'eth_chainId',
      params: [],
    });

    await expect(res).rejects.toMatchInlineSnapshot(
      `[Error: Your token is invalid or expired]`
    );

    api.close();
  });

  it('handles close gracefuly', async () => {
    const server = new WS(fakeUrl + '/ws');

    let api = wrapIdGen(
      () => new WsApi(initWsState({ url: fakeUrl }), WebSocket as any)
    );

    await server.connected;

    let result = api.call({
      method: 'eth_chainId',
      params: [],
    });

    api.close();
    await server.closed;

    return expect(result).rejects.toMatchInlineSnapshot(
      `[Error: Partial request results, not enough data received or errors happened]`
    );
  });

  //   it('returns data with error', () => {
  //     let api = wrapIdGen(() => new WsApi(initWsState({})));

  //     return expect(
  // api.call({
  //   method: 'eth_call',
  //   params: ['', 'test'] })).

  // resolves.toMatchInlineSnapshot(`
  // Object {
  //   "error": Object {
  //     "code": 0,
  //     "message": "invalid argument 0: json: cannot unmarshal string into Go value of type ethapi.CallArgs",
  //   },
  //   "id": "1",
  //   "jsonrpc": "2.0",
  // }
  // `)
  //       .finally(() => {
  //         return api.close();
  //       });
  //   });

  it('tests multi response', async () => {
    let api = wrapIdGen(() => new WsApi(initWsState({})));

    let res = await api.callMulti([
      {
        method: 'eth_getBalance',
        params: ['0x175574c4a5e620fcf83672fa1c8680f41469d7f7', '0xff3b1d'],
      },
      {
        method: 'eth_call',
        params: [
          {
            data: '0xe4a0ce2f',
            gas: '0x2faf080',
            to: '0xa4492fcda2520cb68657d220f4d4ae3116359c10',
          },
          {
            blockHash:
              '0xa691d05d7ce54367f4acb6ab89c55db2aaae685711046e2352ae8ad1f51e9d6f',
          },
        ],
      },
    ]);

    let sorted = res.sort((a, b) => (a.id > b.id ? 1 : -1));

    expect(sorted).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "jsonrpc": "2.0",
    "result": "0x20e6aba154fe",
  },
  Object {
    "id": "2",
    "jsonrpc": "2.0",
    "result": "0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9",
  },
]
`);
    await api.close();
  });
});
