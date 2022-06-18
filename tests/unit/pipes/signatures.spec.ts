import { ReplyItem, Request as DrpcRequest } from 'drpc-proxy';
import { jest } from '@jest/globals';
import { Observable, unsubscribe } from 'observable-fns';
import { collect } from '../../../src/utils';
let checkResult = true;
jest.unstable_mockModule('../../../src/isocrypto/signatures', () => {
  return {
    checkSha256(
      data: string,
      signature: string,
      publicKey: string
    ): Promise<boolean> {
      return Promise.resolve(checkResult);
    },
  };
});
let { checkSignatures } = await import('../../../src/pipes/signatures');
const request: DrpcRequest = {
  id: '450359962737049540',
  provider_ids: ['test'],
  rpc: [
    {
      id: '450359962737049540',
      nonce: 450359962737049540,
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
    },
  ],
  api_key:
    'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJ0ZXN0aW5nIiwiZXhwIjoxNjYyODk4MDg0LCJqdGkiOiJ0ZXN0aW5nIiwiaWF0IjoxNjU0MjU4MDg0fQ.AHL7zUJ1SoBFoNFtT4wXnDTMExfJsJtzqZuGGrxB8By09uBoqPqisUuF2LF15k_fWsJ1zwo-308-WaybBkgpsGndALXFEvzxJ0-ZhSso7VHN0iF4qeWq1gbsCQKer_L9aDCUrnz2UR-xVeri0hqZ2-KheE861fIVKRsCMcvSsVuZeOEB',
  network: 'ethereum',
};
describe('Signatures', () => {
  it('checks correctly signed request', async () => {
    checkResult = true;
    const providerResponses: ReplyItem[] = [
      {
        id: '450359962737049540',
        request_id: 'test11',
        provider_id: 'test',
        result: {
          payload: '0x100001',
          signature:
            '3046022100ae2ba14dfa05ad7e6b77d2eadc0800420fe61cfe7f49b79e698d5f25550d34022100f220549234a1b15ec437a41814d463a7de1e93fd90292e28671c8e84c041b8d9',
          nonce: 450359962737049540,
          id: '450359962737049540',
          upstream_id: 'test-2',
          error: '',
          ok: true,
        },
      },
    ];
    const results = await collect(
      Observable.from(providerResponses).pipe(checkSignatures(request))
    );
    expect(results).toEqual(providerResponses);
  });

  it('checks incorrectly signed request', async () => {
    checkResult = false;
    const providerResponses: ReplyItem[] = [
      {
        id: '450359962737049540',
        request_id: 'test11',
        provider_id: 'test',
        result: {
          payload: '0x100001',
          signature:
            '3046022100ae2ba14dfa05ad7e6b77d2ead0800420fe61cfe607f49b79e698d5f25550d34022100f220549234a1b15ec437a41814d463a7de1e93fd90292e28671c8e84c041b8d9',
          nonce: 450359962737049540,
          id: '450359962737049540',
          upstream_id: 'test-2',
          error: '',
          ok: true,
        },
      },
    ];
    const results = await collect(
      Observable.from(providerResponses).pipe(checkSignatures(request))
    );
    expect(results).toEqual([]);
  });

  it('if no signatures, check fails', async () => {
    checkResult = true;
    const providerResponses: ReplyItem[] = [
      {
        id: '450359962737049540',
        request_id: 'test11',
        provider_id: 'test',
        result: {
          payload: '0x100001',
          signature: '',
          nonce: 0,
          id: '450359962737049540',
          upstream_id: 'test-2',
          error: '',
          ok: true,
        },
      },
    ];
    const results = await collect(
      Observable.from(providerResponses).pipe(checkSignatures(request))
    );
    expect(results).toEqual([]);
  });

  it("if error don't check signature", async () => {
    checkResult = true;
    const data: ReplyItem[] = [
      {
        id: '450359962737049540',
        request_id: 'test11',
        provider_id: 'test',
        result: {
          payload: '',
          signature: '',
          nonce: 0,
          id: '450359962737049540',
          upstream_id: 'test-2',
          error: 'Some error',
          ok: false,
        },
      },
    ];
    const results = await collect(
      Observable.from(data).pipe(checkSignatures(request))
    );
    expect(results).toEqual(data);
  });

  it('handles unsubs correctly', () => {
    let spy = jest.fn();
    let obs = new Observable(() => {
      return () => spy();
    }).pipe(checkSignatures(request));

    let sub = obs.subscribe({});
    unsubscribe(sub);
    expect(spy).toBeCalled();
  });
});
