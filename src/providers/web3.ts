import { JSONRpc, HTTPApi, ProviderSettings } from '../api';
import type { AbstractProvider } from 'web3-core';

export class DrpcProvider implements AbstractProvider {
  readonly api: HTTPApi;
  constructor(settings: ProviderSettings) {
    this.api = new HTTPApi(settings);
  }

  async sendAsync(payload: any, callback: any) {
    let batch = true;
    if (!(payload instanceof Array)) {
      payload = [payload];
      batch = false;
    }
    let ids: any = {};
    let rpcs: JSONRpc[] = payload.map((el: any) => {
      let iid = this.api.id();
      ids[iid] = el.id;
      return {
        method: el.method,
        params: el.params,
        id: iid,
      };
    });

    try {
      let result = await this.api.callMulti(rpcs);
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
