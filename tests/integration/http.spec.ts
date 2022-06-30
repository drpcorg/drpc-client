import { Polly } from '@pollyjs/core';
import { HTTPApi } from '../../src/api';
import { initPolly, initState, wrapIdGen } from '../integration-init';

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
            provider_num: 2,
          })
        )
    );

    let res = await api.call({
      method: 'eth_blockNumber',
      params: [],
    });

    expect(res).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x100001",
}
`);
  });

  it('returns error when incorrect api token', async () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            provider_ids: ['test', 'test1'],
            provider_num: 2,
            api_key: 'test',
          })
        )
    );

    let res = api.call({
      method: 'eth_blockNumber',
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
        method: 'eth_blockNumber',
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
        method: 'eth_gasPrice',
        params: [],
      })
    ).resolves.toMatchInlineSnapshot(`
Object {
  "error": Object {
    "code": 0,
    "message": "Call is not supported",
  },
  "id": "1",
  "jsonrpc": "2.0",
}
`);
  });

  it('tests multi response', async () => {
    let api = wrapIdGen(() => new HTTPApi(initState()));

    let res = await api.callMulti([
      {
        method: 'eth_blockNumber',
        params: [],
      },
      {
        method: 'eth_getBlockByNumber',
        params: ['0x100001'],
      },
    ]);
    expect(res).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "jsonrpc": "2.0",
    "result": "0x100001",
  },
  Object {
    "id": "2",
    "jsonrpc": "2.0",
    "result": Object {
      "difficulty": "0xc6ba1fe7c49",
      "extraData": "0xd783010400844765746887676f312e352e31856c696e7578",
      "gasLimit": "0x2fefd8",
      "gasUsed": "0xa410",
      "hash": "0x18c68d9ba58772a4409d65d61891b25db03a105a7769ae08ef2cff697921b446",
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "miner": "0x0c729be7c39543c3d549282a40395299d987cec2",
      "mixHash": "0xf8679fe0f04d5aad4844694cc8fb1a1b97482a5822658379c9bb8633f91daf97",
      "nonce": "0x347a267c0ec88618",
      "number": "0x100001",
      "parentHash": "0x9a834c53bbee9c2665a5a84789a1d1ad73750b2d77b50de44f457f411d02e52e",
      "receiptsRoot": "0x4f4ed1139baadbd4506d6b0c330335d2108715095fb93fd282bd69aa9edc09eb",
      "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size": "0x304",
      "stateRoot": "0xee13382462fcd5748a403ca131c38e871fa7206bca2b962f67b59e800741daa3",
      "testFoo": "bar",
      "timestamp": "0x56cc7b8c",
      "totalDifficulty": "0x6baba0399a0f2e73",
      "transactions": Array [
        "0x146b8f4b6300c73bb7476359b9f1c5ee3f686a86b2aa673552cf0f9de9a42e77",
        "0xe589a39acea3091b584b650158d08b159aa07e97b8e8cddb8f81cb606e13382e",
      ],
      "transactionsRoot": "0xc90078e2af52aef81815cb2a71c22ebd781dd658dd953d9df57f7769a0b2fe51",
      "uncles": Array [],
    },
  },
]
`);
  });
});
