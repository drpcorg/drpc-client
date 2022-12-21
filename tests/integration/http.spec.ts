import { Polly } from '@pollyjs/core';
import { HTTPApi } from '../../src/api';
import { initPolly, initState, wrapIdGen } from '../integration-init';
import PUBLIC_KEYS from '../../src/keys';

let polly: Polly;
describe('HTTP API', () => {
  beforeAll(() => {
    polly = initPolly('api');
  });
  afterAll(async () => {
    await polly.stop();
  });

  it('tests single response', async () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            provider_ids: ['test', 'test1'],
            quorum_of: 2,
          })
        )
    );

    let res = await api.call({
      method: 'eth_chainId',
      params: [],
    });

    expect(res).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x1",
}
`);
  });

  it('returns error when incorrect api token', async () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
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
  });

  it('timeouts', () => {
    let settings = initState({
      timeout: 100,
    });
    polly.server.post(settings.url + '/rpc').intercept(
      (req, res) => {
        return new Promise((res) => {
          setTimeout(() => res(), 200);
        });
      },
      // @ts-ignore
      { times: 1 }
    );
    let api = wrapIdGen(() => new HTTPApi(settings));
    return expect(
      api.call({
        method: 'eth_chainId',
        params: [],
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Timeout: request took too long to complete]`
    );
  });

  it('returns data with error', () => {
    let api = wrapIdGen(() => new HTTPApi(initState()));

    return expect(
      api.call({
        method: 'test_test',
        params: [],
      })
    ).resolves.toMatchInlineSnapshot(`
Object {
  "error": Object {
    "code": 0,
    "message": "The method test_test does not exist/is not available",
  },
  "id": "1",
  "jsonrpc": "2.0",
}
`);
  });

  it('returns error if response is signed incorrectly', () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            provider_ids: ['test', 'test1'],
            quorum_of: 2,
          })
        )
    );
    let oldKeys = PUBLIC_KEYS['test'];
    PUBLIC_KEYS['test'] = PUBLIC_KEYS['p2p-01'];

    let res = api
      .call({
        method: 'eth_chainId',
        params: [],
      })
      .finally(() => {
        PUBLIC_KEYS['test'] = oldKeys;
      });

    return expect(res).rejects.toMatchInlineSnapshot(
      `[Error: Consensus failure: Unable to reach consensus, response is not trustworthy]`
    );
  });

  it('not returns error if response is signed incorrectly, but skipSignatureCheck set', () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            provider_ids: ['test', 'test1'],
            quorum_of: 2,
            skipSignatureCheck: true,
          })
        )
    );
    let oldKeys = PUBLIC_KEYS['test'];
    PUBLIC_KEYS['test'] = PUBLIC_KEYS['p2p-01'];

    let res = api
      .call({
        method: 'eth_chainId',
        params: [],
      })
      .finally(() => {
        PUBLIC_KEYS['test'] = oldKeys;
      });

    return expect(res).resolves.toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x1",
}
`);
  });

  it('tests multi response', async () => {
    let api = wrapIdGen(() => new HTTPApi(initState()));

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
  });
});
