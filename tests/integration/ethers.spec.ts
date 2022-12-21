import { DrpcProvider } from '../../src/providers/ethers';
import { Polly } from '@pollyjs/core';
import { initPolly, initState, wrapIdGen } from '../integration-init';

let polly: Polly;
describe('ethers provider', () => {
  beforeAll(() => {
    polly = initPolly('ethers');
  });
  afterAll(async () => {
    await polly.stop();
  });

  it('requests block height', async () => {
    let provider = wrapIdGen(() => new DrpcProvider(initState()));
    let result = await provider.getNetwork();
    // @ts-ignore
    expect(result.chainId).toMatchInlineSnapshot(`1`);
  });

  it('timeouts', () => {
    let provider = new DrpcProvider(
      initState({
        timeout: 100,
      })
    );
    polly.server.post(provider.api.state.url + '/rpc').intercept(
      () => {
        return new Promise((res) => {
          setTimeout(res, 200);
        });
      },
      // @ts-ignore
      { times: 1 }
    );
    return expect(provider.getBlockNumber()).rejects.toMatchInlineSnapshot(
      `[Error: Timeout: request took too long to complete]`
    );
  });

  it('requests block', async () => {
    let provider = wrapIdGen(() => new DrpcProvider(initState()));
    let result = await provider.getBlock('0x0');
    // @ts-ignore
    expect(result).toMatchInlineSnapshot(`
Object {
  "_difficulty": Object {
    "hex": "0x0400000000",
    "type": "BigNumber",
  },
  "difficulty": 17179869184,
  "extraData": "0x11bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82fa",
  "gasLimit": Object {
    "hex": "0x1388",
    "type": "BigNumber",
  },
  "gasUsed": Object {
    "hex": "0x00",
    "type": "BigNumber",
  },
  "hash": "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3",
  "miner": "0x0000000000000000000000000000000000000000",
  "nonce": "0x0000000000000042",
  "number": 0,
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "timestamp": 0,
  "transactions": Array [],
}
`);
  });
});
