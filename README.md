# DRPC SDK

Client-side library for working for DRPC. It's responsibility to communicte with DRPC and also check provided
signatures for response data to validate data origin.

## Installation

`npm install drpc-sdk`

## Example

```js
import { provider, makeRequest } from 'drpc-sdk';

async function getBlockHeight() {
  let state = provider({
    api_key: 'api key',
    url: 'https://drpc.org/api',
    provider_ids: ['test'],
    provider_num: 1,
  });
  let blockheight = await makeRequest(
    {
      method: 'eth_blockNumber',
      params: [],
    },
    state
  );
}
```

## Ethers.js provider

If you're using `ethers.js`, drpc-sdk exposes provider

```js
import {} from 'drpc-sdk/providers/ethers';

async function getBlock(tag) {
  let state = provider({
    api_key: 'api key',
    url: 'https://drpc.org/api',
    provider_ids: ['test'],
    provider_num: 1,
  });
  let provider = new DrpcProvider(state);
  let block = await provider.getBlock(tag);
}
```
