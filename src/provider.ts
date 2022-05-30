// import {
//   UrlJsonRpcProvider,
//   CommunityResourcable,
//   showThrottleMessage,
//   JsonRpcBatchProvider,
// } from '@ethersproject/providers';
// import { ConnectionInfo, fetchJson } from '@ethersproject/web';
// import { Logger } from '@ethersproject/logger';
// import { Network } from '@ethersproject/networks';

// const defaultApiKey =
//   'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJ0ZXN0IiwiZXhwIjoxNjYyMTE2NzE1LCJqdGkiOiJteXRva2VuIiwiaWF0IjoxNjUzNDc2NzE1fQ.AAOZk5d8IsA7JF1ERR4T7ilTZ6fhf-_dqny9Grpe7E6xJGyuVb38KycxLKIwxqo2N3Bg1DGqMi9gzGef-bsdSzE_ADRcPMngR9Okywtst0Tgu3DNkdRi2hqSqevPtRf1MhAVge9MtZwLf81xqD6aPZtprsr6UcC8iCyGS0YO1Si_AJSe';

// const defaultUrl = 'localhost:8090';
// const logger = new Logger('drpc 0.1');

// type ApiKey = {
//   api_key: string;
// };

// type ConnectionInfoExt = {
//   network: Network;
// } & ConnectionInfo;

// function isApiKey(key: any): key is ApiKey {
//   if (typeof key === 'object') {
//     return Object.hasOwn(key, 'api_key');
//   }
//   return false;
// }

// export class DrpcProvider
//   extends UrlJsonRpcProvider
//   implements CommunityResourcable
// {
//   static getApiKey(apiKey: any): ApiKey {
//     const apiKeyObj = {
//       api_key: defaultApiKey,
//     };

//     if (apiKey == null) {
//       return apiKeyObj;
//     }

//     if (typeof apiKey === 'string') {
//       apiKeyObj.api_key = apiKey;
//     } else {
//       logger.throwError('Api key should be string');
//     }

//     return apiKeyObj;
//   }

//   send(method: string, params: Array<any>): Promise<any> {
//     const request = {
//       method: method,
//       params: params,
//       id: this._nextId++,
//       jsonrpc: '2.0',
//     };

//     this.emit('debug', {
//       action: 'request',
//       request: request,
//       provider: this,
//     });

//     // We can expand this in the future to any call, but for now these
//     // are the biggest wins and do not require any serializing parameters.
//     const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0;
//     if (cache && this._cache[method]) {
//       return this._cache[method];
//     }

//     const result = fetchJson(this.connection, JSON.stringify(request)).then(
//       (result) => {
//         this.emit('debug', {
//           action: 'response',
//           request: request,
//           response: result,
//           provider: this,
//         });

//         return result;
//       },
//       (error) => {
//         this.emit('debug', {
//           action: 'response',
//           error: error,
//           request: request,
//           provider: this,
//         });

//         throw error;
//       }
//     );

//     // Cache the fetch, but clear it on the next event loop
//     if (cache) {
//       this._cache[method] = result;
//       setTimeout(() => {
//         delete this._cache[method];
//       }, 0);
//     }

//     return result;
//   }

//   static getUrl(network: Network, apiKey: any): ConnectionInfoExt {
//     if (!isApiKey(apiKey)) {
//       throw logger.throwError('Passed non api key object');
//     }

//     const connection: ConnectionInfoExt = {
//       allowGzip: false,
//       url: defaultUrl,
//       throttleCallback: (attempt: number, url: string) => {
//         if (apiKey.api_key === defaultApiKey) {
//           showThrottleMessage();
//         }
//         return Promise.resolve(true);
//       },
//       network: network,
//     };

//     return connection;
//   }

//   isCommunityResource(): boolean {
//     return this.apiKey.api_key === defaultApiKey;
//   }
// }
