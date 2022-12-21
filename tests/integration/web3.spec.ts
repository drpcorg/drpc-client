import { HttpDrpcProvider } from '../../src/providers/web3';
import { Polly } from '@pollyjs/core';
import { initPolly, initState, wrapIdGen } from '../integration-init';
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
    let provider = new HttpDrpcProvider(
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
    let web3 = new Web3(provider);
    return expect(web3.eth.getBlockNumber()).rejects.toMatchInlineSnapshot(
      `[Error: Timeout: request took too long to complete]`
    );
  });

  it('requests block height', async () => {
    let provider = wrapIdGen(() => new HttpDrpcProvider(initState()));
    let web3 = new Web3(provider);
    let result = await web3.eth.getChainId();
    // @ts-ignore
    expect(result).toMatchInlineSnapshot(`1`);
  });

  it('requests block and block height', async () => {
    let provider = wrapIdGen(() => new HttpDrpcProvider(initState()));
    let web3 = new Web3(provider);
    var batch = new web3.BatchRequest();

    let [blockp, blockpres, blockprej] = createCallbackPromise();
    batch.add(
      //@ts-ignore
      web3.eth.getBlock.request(0x0, (error, result) => {
        try {
          // @ts-ignore
          expect(result).toMatchInlineSnapshot(`
Object {
  "difficulty": "17179869184",
  "extraData": "0x11bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82fa",
  "gasLimit": 5000,
  "gasUsed": 0,
  "hash": "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3",
  "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "miner": "0x0000000000000000000000000000000000000000",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "nonce": "0x0000000000000042",
  "number": 0,
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "receiptsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
  "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
  "size": 540,
  "stateRoot": "0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544",
  "timestamp": 0,
  "totalDifficulty": "17179869184",
  "transactions": Array [],
  "transactionsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
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
      web3.eth.getChainId.request((error, result) => {
        try {
          // @ts-ignore
          expect(result).toMatchInlineSnapshot(`1`);
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
