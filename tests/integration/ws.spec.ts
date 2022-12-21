import { WsApi } from '../../src/api';
import { initState, wrapIdGen } from '../integration-init';
import { WS } from 'jest-websocket-mock';
import { WebSocket } from 'mock-socket';

let fakeUrl = 'ws://localhost:1234';
describe('Websocket API', () => {
  afterEach(() => {
    WS.clean();
  });

  it('tests single response', async () => {
    let api = wrapIdGen(
      () => new WsApi(initState({ url: 'ws://localhost:8090' }))
    );
    let res = api.call({
      method: 'eth_chainId',
      params: [],
    });
    expect(await res).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x1",
}
`);
    await api.close();
  });

  it('timeouts', async () => {
    const server = new WS(fakeUrl + '/ws');
    let api = wrapIdGen(
      () =>
        new WsApi(initState({ url: fakeUrl, timeout: 1000 }), WebSocket as any)
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
      () => new WsApi(initState({ url: fakeUrl }), WebSocket as any)
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
          initState({
            url: 'ws://localhost:8090',
            provider_ids: ['test', 'test1'],
            quorum_of: 2,
            api_key: 'test',
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
      () => new WsApi(initState({ url: fakeUrl }), WebSocket as any)
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

  it('returns data with error', () => {
    let api = wrapIdGen(
      () => new WsApi(initState({ url: 'ws://localhost:8090' }))
    );

    return expect(
api.call({
  method: 'test_test',
  params: [] })).


resolves.toMatchInlineSnapshot(`
Object {
  "error": Object {
    "code": 0,
    "message": "The method test_test does not exist/is not available",
  },
  "id": "1",
  "jsonrpc": "2.0",
}
`)
      .finally(() => {
        return api.close();
      });
  });

  it('tests multi response', async () => {
    let api = wrapIdGen(
      () => new WsApi(initState({ url: 'ws://localhost:8090' }))
    );

    let res = await api.callMulti([
      {
        method: 'eth_chainId',
        params: [],
      },
      {
        method: 'eth_getBlockByNumber',
        params: ['0x0', false],
      },
    ]);
    expect(res).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "jsonrpc": "2.0",
    "result": "0x1",
  },
  Object {
    "id": "2",
    "jsonrpc": "2.0",
    "result": Object {
      "difficulty": "0x400000000",
      "extraData": "0x11bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82fa",
      "gasLimit": "0x1388",
      "gasUsed": "0x0",
      "hash": "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3",
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "miner": "0x0000000000000000000000000000000000000000",
      "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "nonce": "0x0000000000000042",
      "number": "0x0",
      "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "receiptsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size": "0x21c",
      "stateRoot": "0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544",
      "timestamp": "0x0",
      "totalDifficulty": "0x400000000",
      "transactions": Array [],
      "transactionsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      "uncles": Array [],
    },
  },
]
`);
    await api.close();
  });
});
