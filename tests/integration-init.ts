import * as dotenv from 'dotenv';

// Load .env file only if we are not in a browser
if (typeof window === 'undefined') {
  dotenv.config();
}

import {
  ProviderSettings,
  ProviderSettingsMaybeURL,
  RpcState,
} from '../src/api';
import Sinon from 'sinon';

export const DRPC_DKEY = process.env.DRPC_DKEY;
export const DRPC_DKEY_PAID = process.env.DRPC_DKEY_PAID;

export function wrapIdGen<T>(fn: () => T): T {
  Sinon.stub(Math, 'random').returns(0);
  let r = fn();
  Sinon.restore();

  return r;
}

export function initState(pstate: Partial<RpcState> = {}) {
  let state: ProviderSettingsMaybeURL = {
    provider_ids: ['p2p-01'],
    dkey: DRPC_DKEY,
  };
  return { ...state, ...pstate };
}

export function initWsState(pstate: Partial<RpcState> = {}) {
  let state: ProviderSettingsMaybeURL = {
    provider_ids: ['p2p-01'],
    dkey: DRPC_DKEY,
  };
  return { ...state, ...pstate };
}
