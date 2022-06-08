import { DrpcProvider } from '../../src/providers/ethers';
import { Polly } from '@pollyjs/core';
import { initPolly, initState } from '../integration-init';

let polly: Polly;
afterAll(async () => {
  await polly.stop();
});

describe('ethers provider', () => {
  beforeAll(() => {
    polly = initPolly('ethers');
  });

  it('requests block height', async () => {
    let provider = new DrpcProvider(initState());
    let result = await provider.getBlockNumber();
    // @ts-ignore
    expect(result).toMatchInlineSnapshot(`1048577`);
  });

  it('timeouts', () => {
    let provider = new DrpcProvider(
      initState({
        timeout: 100,
        fetchOpt: () =>
          (() => {
            return new Promise(() => {});
          }) as any,
      })
    );
    return expect(provider.getBlockNumber()).rejects.toMatchInlineSnapshot(
      `[Error: Request exceeded timeout of 100]`
    );
  });

  it('returns data with error', async () => {
    let provider = new DrpcProvider(initState());
    return expect(provider.getGasPrice()).rejects.toMatchInlineSnapshot(
      `[Error: Call is not supported]`
    );
  });

  it('requests block', async () => {
    let provider = new DrpcProvider(initState());
    let result = await provider.getBlock('0x100001');
    // @ts-ignore
    expect(result).toMatchInlineSnapshot(`
Object {
  "_difficulty": Object {
    "hex": "0x0c6ba1fe7c49",
    "type": "BigNumber",
  },
  "difficulty": 13656418843721,
  "extraData": "0xd783010400844765746887676f312e352e31856c696e7578",
  "gasLimit": Object {
    "hex": "0x2fefd8",
    "type": "BigNumber",
  },
  "gasUsed": Object {
    "hex": "0xa410",
    "type": "BigNumber",
  },
  "hash": "0x18c68d9ba58772a4409d65d61891b25db03a105a7769ae08ef2cff697921b446",
  "miner": "0x0C729BE7c39543C3D549282A40395299d987cEc2",
  "nonce": "0x347a267c0ec88618",
  "number": 1048577,
  "parentHash": "0x9a834c53bbee9c2665a5a84789a1d1ad73750b2d77b50de44f457f411d02e52e",
  "timestamp": 1456241548,
  "transactions": Array [
    "0x146b8f4b6300c73bb7476359b9f1c5ee3f686a86b2aa673552cf0f9de9a42e77",
    "0xe589a39acea3091b584b650158d08b159aa07e97b8e8cddb8f81cb606e13382e",
  ],
}
`);
  });
});
