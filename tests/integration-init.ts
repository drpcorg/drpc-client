import * as dotenv from 'dotenv';

// Load .env file only if we are not in a browser
if (typeof window === 'undefined') {
  dotenv.config();
}

import { ProviderSettings, RpcState } from '../src/api';
import Sinon from 'sinon';

const PROXY_URL = 'https://main.drpc.org';
const PROXY_URL_WS = 'wss://main.drpc.org';

export const DRPC_DKEY = process.env.DRPC_DKEY;
export const DRPC_DKEY_PAID = process.env.DRPC_DKEY_PAID;

export function wrapIdGen<T>(fn: () => T): T {
  Sinon.stub(Math, 'random').returns(0);
  let r = fn();
  Sinon.restore();

  return r;
}

export function initState(pstate: Partial<RpcState> = {}) {
  let state: ProviderSettings = {
    url: PROXY_URL,
    provider_ids: ['p2p-01'],
    dkey: DRPC_DKEY,
  };
  return { ...state, ...pstate };
}

export function initWsState(pstate: Partial<RpcState> = {}) {
  let state: ProviderSettings = {
    url: PROXY_URL_WS,
    provider_ids: ['p2p-01'],
    dkey: DRPC_DKEY,
  };
  return { ...state, ...pstate };
}
