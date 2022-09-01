import { Polly } from '@pollyjs/core';
import NodeAdapter from '@pollyjs/adapter-node-http';
import FsPersister from '@pollyjs/persister-fs';
import FetchAdapter from '@pollyjs/adapter-fetch';
import RestPersister from '@pollyjs/persister-rest';
import path from 'path';
import { ProviderSettings, RpcState } from '../src/api';
import Sinon from 'sinon';

if (NodeAdapter.id) {
  Polly.register(NodeAdapter);
  Polly.register(FsPersister);
} else {
  Polly.register(FetchAdapter);
  Polly.register(RestPersister);
}

const PROXY_URL = 'http://localhost:8090';
export function wrapIdGen<T>(fn: () => T): T {
  Sinon.stub(Math, 'random').returns(0);
  let r = fn();
  Sinon.restore();

  return r;
}
export function initPolly(name: string): Polly {
  let polly: Polly;
  if (NodeAdapter.id) {
    polly = new Polly(name, {
      adapters: ['node-http'],
      persister: 'fs',
      recordFailedRequests: true,
      matchRequestsBy: {
        method: true,
        headers: false,
        body: true,
        order: false,
      },
      persisterOptions: {
        fs: {
          recordingsDir: path.join('tests/__recordings__', 'node'),
        },
      },
    });
  } else {
    polly = new Polly(name, {
      adapters: ['fetch'],
      recordFailedRequests: true,
      persister: 'rest',
      matchRequestsBy: {
        method: true,
        headers: false,
        body: true,
        order: false,
      },
    });
  }
  if (process.env.NO_POLLY) {
    polly.pause();
  }
  return polly;
}

export function initState(pstate: Partial<RpcState> = {}) {
  let state: ProviderSettings = {
    api_key:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJwZXJmIiwidG9rZW5faWQiOiJwZXJmIiwiaWF0IjoxNjYyMDQ0ODYxLCJleHAiOjE2NzA2ODQ4NjF9.18SFUoMhVJAIpLhit3mF4hfvZlfCp3ap-gObatvyXMw',
    url: PROXY_URL,
    provider_ids: ['test'],
    provider_num: 1,
    dontShuffle: true,
  };
  return { ...state, ...pstate };
}
