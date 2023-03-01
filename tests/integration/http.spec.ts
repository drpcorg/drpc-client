import { HTTPApi } from '../../src/api';
import { initState, wrapIdGen, DRPC_DKEY_PAID } from '../integration-init';
import PUBLIC_KEYS from '../../src/keys';
import { JestExpect } from '@jest/expect';
import { it as JestIt } from '@jest/globals';

declare var expect: JestExpect;
declare var it: typeof JestIt;

describe('HTTP API', () => {
  it('tests single response eth_call', async () => {
    let api = wrapIdGen(() => new HTTPApi(initState({})));

    let res = await api.call({
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
      id: 100,
    });

    expect(res).toMatchInlineSnapshot(`
Object {
  "id": "100",
  "jsonrpc": "2.0",
  "result": "0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9",
}
`);
  });

  it('fails if incorrect dkey token passed', async () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            dkey: '123',
          })
        )
    );

    let res = api.call({
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
      id: 100,
    });

    await expect(res).rejects.toMatchInlineSnapshot(
      `[Error: Your token is invalid or expired]`
    );
  });

  it('Should run okay with paid key and specified quorum', async () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            quorum_of: 4,
            dkey: DRPC_DKEY_PAID,
            provider_ids: ['p2p-01', 'attestant', 'p-ops', 'stakesquid'],
          })
        )
    );

    let res = api.callMulti([
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

    await expect(res).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "id": "2",
    "jsonrpc": "2.0",
    "result": "0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9",
  },
  Object {
    "id": "1",
    "jsonrpc": "2.0",
    "result": "0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9",
  },
]
`);
  });

  it('timeouts', () => {
    let settings = initState({
      timeout: 1,
    });

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

  //   it('returns data with error', () => {
  //     let api = wrapIdGen(() => new HTTPApi(initState({})));

  //     return expect(
  //       api.call({
  //         method: 'eth_call',
  //         params: ['', 'test'],
  //       })
  //     ).resolves.toMatchInlineSnapshot(`
  // Object {
  //   "error": Object {
  //     "code": 0,
  //     "message": "Invalid params",
  //   },
  //   "id": "1",
  //   "jsonrpc": "2.0",
  // }
  // `);
  //   });

  it('returns error if response is signed incorrectly', () => {
    let api = wrapIdGen(
      () =>
        new HTTPApi(
          initState({
            provider_ids: ['p2p-01', 'attestant'],
            quorum_of: 2,
            dkey: DRPC_DKEY_PAID,
          })
        )
    );

    let oldp2p = PUBLIC_KEYS['p2p-01'];
    PUBLIC_KEYS['p2p-01'] = PUBLIC_KEYS['test'];

    let res = api
      .call({
        method: 'eth_blockNumber',
        params: [],
      })
      .finally(() => {
        PUBLIC_KEYS['p2p-01'] = oldp2p;
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
            provider_ids: ['p2p-01', 'attestant'],
            quorum_of: 2,
            dkey: DRPC_DKEY_PAID,
            skipSignatureCheck: true,
          })
        )
    );

    let oldp2p = PUBLIC_KEYS['p2p-01'];
    PUBLIC_KEYS['p2p-01'] = PUBLIC_KEYS['test'];

    let res = api
      .call({
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
      })
      .finally(() => {
        PUBLIC_KEYS['p2p-01'] = oldp2p;
      });

    return expect(res).resolves.toMatchInlineSnapshot(`
Object {
  "id": "1",
  "jsonrpc": "2.0",
  "result": "0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9",
}
`);
  });

  it('tests multi response', async () => {
    let api = wrapIdGen(() => new HTTPApi(initState()));

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
  });
});
