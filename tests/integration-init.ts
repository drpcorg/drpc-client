import { Polly } from '@pollyjs/core';
import NodeAdapter from '@pollyjs/adapter-node-http';
import FsPersister from '@pollyjs/persister-fs';
import FetchAdapter from '@pollyjs/adapter-fetch';
import RestPersister from '@pollyjs/persister-rest';
import Sinon from 'sinon';
import path from 'path';
import { provider } from '../src/api';

if (NodeAdapter.id) {
  Polly.register(NodeAdapter);
  Polly.register(FsPersister);
} else {
  Polly.register(FetchAdapter);
  Polly.register(RestPersister);
}

const PROXY_URL = 'http://localhost:8090/rpc';
let pollyCache: Polly;
export function initPolly(name: string): Polly {
  let polly: Polly;
  if (NodeAdapter.id) {
    polly = new Polly(name, {
      adapters: ['node-http'],
      persister: 'fs',
      persisterOptions: {
        fs: {
          recordingsDir: path.join(__dirname, '__recordings__', 'node'),
        },
      },
    });
  } else {
    if (pollyCache) {
      polly = pollyCache;
    } else {
      polly = new Polly('drpc', {
        adapters: ['fetch'],
        persister: 'rest',
      });
      pollyCache = polly;
    }
  }
  if (process.env.NO_POLLY) {
    polly.pause();
  }
  return polly;
}

export function initState() {
  Sinon.stub(Math, 'random').returns(100);
  let state = provider({
    api_key:
      'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJ0ZXN0aW5nIiwiZXhwIjoxNjYyODk4MDg0LCJqdGkiOiJ0ZXN0aW5nIiwiaWF0IjoxNjU0MjU4MDg0fQ.AHL7zUJ1SoBFoNFtT4wXnDTMExfJsJtzqZuGGrxB8By09uBoqPqisUuF2LF15k_fWsJ1zwo-308-WaybBkgpsGndALXFEvzxJ0-ZhSso7VHN0iF4qeWq1gbsCQKer_L9aDCUrnz2UR-xVeri0hqZ2-KheE861fIVKRsCMcvSsVuZeOEB',
    url: PROXY_URL,
    provider_ids: ['test'],
    provider_num: 1,
  });
  Sinon.restore();
  return state;
}
