import {
  ProviderResponse,
  Request as DrpcRequest,
} from 'dproxy/ts/protocol.cjs';
import { checkSignatures } from '../../src/signatures';
jest.mock('../../src/isocrypto/signatures');
describe('Signatures', () => {
  it('checks signed request', async () => {
    const providerResponses: ProviderResponse[] = [
      {
        id: '450359962737049540',
        provider_id: 'test',
        rpc_data: [
          {
            payload: '0x100001',
            signature:
              '3046022100ae2ba14dfa05ad7e6b77d2eadc0800420fe61cfe607f49b79e698d5f25550d34022100f220549234a1b15ec437a41814d463a7de1e93fd90292e28671c8e84c041b8d9',
            nonce: 450359962737049540,
            id: '450359962737049540',
            upstream_id: 'test-2',
            error: '',
            ok: true,
          },
        ],
      },
    ];
    const request: DrpcRequest = {
      id: '450359962737049540',
      provider_ids: ['test'],
      provider_num: 1,
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

    expect(await checkSignatures(providerResponses, request)).toEqual(
      providerResponses
    );
  });
});
