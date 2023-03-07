import { JsonRpcSigner, StaticJsonRpcProvider } from '@ethersproject/providers';
import { HTTPApi, ProviderSettingsMaybeURL } from '../api';
import { Logger } from '@ethersproject/logger';

const logger = new Logger('drpc 0.1');

export class DrpcProvider extends StaticJsonRpcProvider {
  readonly api: HTTPApi;

  constructor(settings: ProviderSettingsMaybeURL) {
    let api = new HTTPApi(settings);
    let network = api.state.network;
    let connection = { url: api.state.url };
    super(connection, network);
    this.api = api;
  }
  send(method: string, params: Array<any>): Promise<any> {
    const request = {
      method: method,
      params: params,
      id: this._nextId++,
      jsonrpc: '2.0',
    };

    this.emit('debug', {
      action: 'request',
      request: request,
      provider: this,
    });

    // We can expand this in the future to any call, but for now these
    // are the biggest wins and do not require any serializing parameters.
    const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0;
    // @ts-ignore
    if (cache && this._cache[method]) {
      return this._cache[method];
    }
    const result = this.api.call({
      method: method,
      params: params,
    });

    // Cache the fetch, but clear it on the next event loop
    if (cache) {
      this._cache[method] = result;
      setTimeout(() => {
        delete this._cache[method];
      }, 0);
    }

    return result.then((payload) => {
      if (payload.error) {
        const error: any = new Error(payload.error.message);
        error.code = payload.error.code;
        error.data = payload.error.data;
        throw error;
      }
      return payload.result;
    });
  }

  _startPending(): void {
    logger.warn('WARNING: API provider does not support pending filters');
  }

  getSigner(address?: string): JsonRpcSigner {
    return logger.throwError(
      'API provider does not support signing',
      Logger.errors.UNSUPPORTED_OPERATION,
      { operation: 'getSigner' }
    );
  }
}
