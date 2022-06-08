import { DrpcProvider } from '../../src/providers/web3';
import { Polly } from '@pollyjs/core';
import { initPolly, initState } from '../integration-init';
import Web3 from 'web3';

let polly: Polly;
function createCallbackPromise(): [
  Promise<any>,
  (value: unknown) => void,
  (reasone?: any) => void
] {
  let rs: (value: unknown) => void;
  let rj: (reasone?: any) => void;
  let promise = new Promise((resolve, reject) => {
    rs = resolve;
    rj = reject;
  });
  // @ts-ignore
  return [promise, rs, rj];
}

describe('web3 provider', () => {
  beforeAll(() => {
    polly = initPolly('web3');
  });

  afterAll(async () => {
    await polly.stop();
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
    let web3 = new Web3(provider);
    return expect(web3.eth.getBlockNumber()).rejects.toMatchInlineSnapshot(
      `[Error: Request exceeded timeout of 100]`
    );
  });

  it('returns data with error', async () => {
    let provider = new DrpcProvider(initState());
    let web3 = new Web3(provider);
    return expect(web3.eth.getGasPrice()).rejects.toMatchInlineSnapshot(
      `[Error: Returned error: Call is not supported]`
    );
  });

  it('requests block height', async () => {
    let provider = new DrpcProvider(initState());
    let web3 = new Web3(provider);
    let result = await web3.eth.getBlockNumber();
    // @ts-ignore
    expect(result).toMatchInlineSnapshot(`1048577`);
  });

  it('requests block and block height', async () => {
    let provider = new DrpcProvider(initState());
    let web3 = new Web3(provider);
    var batch = new web3.BatchRequest();

    let [blockp, blockpres, blockprej] = createCallbackPromise();
    batch.add(
      //@ts-ignore
      web3.eth.getBlock.request(0x100001, (error, result) => {
        try {
          // @ts-ignore
          expect(result).toMatchInlineSnapshot(`
Object {
  "difficulty": "13656418843721",
  "extraData": "0xd783010400844765746887676f312e352e31856c696e7578",
  "gasLimit": 3141592,
  "gasUsed": 42000,
  "hash": "0x18c68d9ba58772a4409d65d61891b25db03a105a7769ae08ef2cff697921b446",
  "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "miner": "0x0C729BE7c39543C3D549282A40395299d987cEc2",
  "mixHash": "0xf8679fe0f04d5aad4844694cc8fb1a1b97482a5822658379c9bb8633f91daf97",
  "nonce": "0x347a267c0ec88618",
  "number": 1048577,
  "parentHash": "0x9a834c53bbee9c2665a5a84789a1d1ad73750b2d77b50de44f457f411d02e52e",
  "receiptsRoot": "0x4f4ed1139baadbd4506d6b0c330335d2108715095fb93fd282bd69aa9edc09eb",
  "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
  "size": 772,
  "stateRoot": "0xee13382462fcd5748a403ca131c38e871fa7206bca2b962f67b59e800741daa3",
  "testFoo": "bar",
  "timestamp": 1456241548,
  "totalDifficulty": "7758470952334077555",
  "transactions": Array [
    "0x146b8f4b6300c73bb7476359b9f1c5ee3f686a86b2aa673552cf0f9de9a42e77",
    "0xe589a39acea3091b584b650158d08b159aa07e97b8e8cddb8f81cb606e13382e",
  ],
  "transactionsRoot": "0xc90078e2af52aef81815cb2a71c22ebd781dd658dd953d9df57f7769a0b2fe51",
  "uncles": Array [],
}
`);
          blockpres(null);
        } catch (e: unknown) {
          blockprej(e);
        }
      })
    );

    let [blocknump, blocknumpres, blocknumprej] = createCallbackPromise();
    batch.add(
      //@ts-ignore
      web3.eth.getBlockNumber.request((error, result) => {
        try {
          // @ts-ignore
          expect(result).toMatchInlineSnapshot(`1048577`);
          blocknumpres(null);
        } catch (e: unknown) {
          blocknumprej(e);
        }
      })
    );

    batch.execute();
    return Promise.all([blockp, blocknump]);
  });
});
