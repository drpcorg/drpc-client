# DRPC SDK

Client-side library for working with DRPC (drpc.org). It's responsibility to communicate with DRPC and also to check provided
signatures for response data, validating data authenticity.

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

## Documentation

[API Documentation](https://p2p-org.github.io/drpc-client/)

### Using in browser

This module is written to work in node and browser. Because of that, by default webpack and other bundlers will try
to bundle node dependencies (like node-fetch, etc). However, if you use webpack you can just define constant and it will eliminate any
non-browser code.

```js
{
  // ....
  plugins: [
    new webpack.DefinePlugin({
      __isBrowser__: 'true',
    }),
  ],
};
```

### Web3.js provider

If you're using `web3.js`, drpc-sdk exposes the provider

```js
import { DrpcProvider } from 'drpc-sdk/providers/web3';

async function getBlock(tag) {
  let state = provider({
    api_key: 'api key',
    url: 'https://drpc.org/api',
    provider_ids: ['test'],
    provider_num: 1,
  });
  let provider = new DrpcProvider(state);
  let web3 = new Web3(provider);

  let result = await web3.eth.getBlockNumber();
}
```

### Ethers.js provider

If you're using `ethers.js`, drpc-sdk exposes the provider

```js
import { DrpcProvider } from 'drpc-sdk/providers/ethers';

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
