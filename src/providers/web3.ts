import { JSONRpc, HTTPApi, WsApi, ProviderSettings } from '../api';
import type { AbstractProvider } from 'web3-core';

abstract class DrpcProvider implements AbstractProvider {
  protected abstract callApi(rpcs: JSONRpc[]): Promise<any[]>;
  protected abstract id(): number;
  async sendAsync(payload: any, callback: any) {
    let batch = true;
    if (!(payload instanceof Array)) {
      payload = [payload];
      batch = false;
    }
    let ids: any = {};
    let rpcs: JSONRpc[] = payload.map((el: any) => {
      let iid = this.id();
      ids[iid] = el.id;
      return {
        method: el.method,
        params: el.params,
        id: iid,
      };
    });

    try {
      let result = await this.callApi(rpcs);
      let mresult = result.map((el) => {
        el.id = ids[el.id];
        return el;
      });
      if (batch) {
        callback(null, mresult);
      } else {
        callback(null, mresult[0]);
      }
    } catch (e: unknown) {
      callback(e);
    }
  }

  disconnect() {}
  supportsSubscriptions() {
    return false;
  }
}

export class HttpDrpcProvider extends DrpcProvider {
  readonly api: HTTPApi;
  protected id() {
    return this.api.id();
  }
  constructor(settings: ProviderSettings) {
    super();
    this.api = new HTTPApi(settings);
  }

  protected callApi(rpcs: JSONRpc[]): Promise<any[]> {
    return this.api.callMulti(rpcs);
  }
}

export class WsDrpcProvider extends DrpcProvider {
  readonly api: WsApi;
  protected id() {
    return this.api.id();
  }
  constructor(settings: ProviderSettings) {
    super();
    this.api = new WsApi(settings);
  }

  protected callApi(rpcs: JSONRpc[]): Promise<any[]> {
    return this.api.callMulti(rpcs);
  }
}
