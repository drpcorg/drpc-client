import { JestExpect } from '@jest/expect';
import { HttpDrpcProvider } from '../../src/providers/web3';
import { initState, wrapIdGen } from '../integration-init';
import Web3 from 'web3';

declare var expect: JestExpect;

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
  it('timeouts', () => {
    let provider = new HttpDrpcProvider(
      initState({
        timeout: 1,
      })
    );

    let web3 = new Web3(provider);

    return expect(web3.eth.getBlockNumber()).rejects.toMatchInlineSnapshot(
      `[Error: Timeout: request took too long to complete]`
    );
  });

  it('requests block height', async () => {
    let provider = wrapIdGen(() => new HttpDrpcProvider(initState()));
    let web3 = new Web3(provider);
    let result = await web3.eth.getBalance(
      '0x175574c4a5e620fcf83672fa1c8680f41469d7f7',
      '0xff3b1d'
    );
    expect(result).toMatchInlineSnapshot(`"36175094043902"`);
  });

  it('requests block and block height', async () => {
    // let provider = wrapIdGen(() => new HttpDrpcProvider(initState({})));
    let provider = new HttpDrpcProvider(initState({}));
    let web3 = new Web3(provider);
    var batch = new web3.BatchRequest();

    let [blockp, blockpres, blockprej] = createCallbackPromise();

    batch.add(
      //@ts-ignore
      web3.eth.getBalance.request(
        '0x175574c4a5e620fcf83672fa1c8680f41469d7f7',
        '0xff3b1d',
        //@ts-ignore
        (error, result) => {
          try {
            expect(result).toMatchInlineSnapshot(`"36175094043902"`);
            blockpres(null);
          } catch (e: unknown) {
            blockprej(e);
          }
        }
      )
    );

    let [blocknump, blocknumpres, blocknumprej] = createCallbackPromise();
    batch.add(
      //@ts-ignore
      web3.eth.call.request(
        {
          data: '0xe4a0ce2f',
          gas: '0x2faf080',
          to: '0xa4492fcda2520cb68657d220f4d4ae3116359c10',
        },
        '0xa691d05d7ce54367f4acb6ab89c55db2aaae685711046e2352ae8ad1f51e9d6f',
        //@ts-ignore
        (error, result) => {
          try {
            // @ts-ignore
            expect(result).toMatchInlineSnapshot(
              `"0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000005f4ec3df9cbd43714fe2740f5e3616155c5b8419000000000000000000000000aed0c38402a5d19df6e4c03f4e2dced6e29c1ee9"`
            );
            blocknumpres(null);
          } catch (e: unknown) {
            blocknumprej(e);
          }
        }
      )
    );

    batch.execute();
    return Promise.all([blockp, blocknump]);
  });
});
