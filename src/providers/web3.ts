import { JSONRpc, makeRequestMulti, RpcState } from '../../src/api';
import type { AbstractProvider } from 'web3-core';

export class DrpcProvider implements AbstractProvider {
  readonly state;
  constructor(state: RpcState) {
    this.state = state;
  }

  async sendAsync(payload: any, callback: any) {
    let batch = true;
    if (!(payload instanceof Array)) {
      payload = [payload];
      batch = false;
    }
    let rpcs: JSONRpc[] = payload.map((el: any) => {
      return {
        method: el.method,
        params: el.params,
        id: el.id,
      };
    });

    // web3 is ok with number and string ids
    // we expect only strings, so we just save those to remap as needed
    let ids = payload.reduce((acc: any, el: any) => {
      acc[el.id] = el.id;
      return acc;
    }, {});
    try {
      let result = await makeRequestMulti(rpcs, this.state);
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
