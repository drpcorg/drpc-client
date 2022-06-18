import { consensus } from '../../../src/pipes/consensus';
import { JSONRPCResponse } from 'drpc-proxy';
import { Observable, unsubscribe } from 'observable-fns';
import { collect, wait } from '../../../src/utils';
import { jest } from '@jest/globals';

const defaultResponse = {
  payload: '0x100001',
  signature: '',
  nonce: 0,
  id: '1',
  upstream_id: 'test-2',
  error: '',
  ok: true,
};

function createResponse(data: Partial<JSONRPCResponse> = {}) {
  return { ...defaultResponse, ...data };
}

describe('Consensus', () => {
  it('one response consensus', async () => {
    const items: JSONRPCResponse[] = [createResponse()];
    let result = await collect(Observable.from(items).pipe(consensus(1)));
    expect(result).toEqual(items);
  });

  it('2 responses from 1 provide', async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '2' }),
    ];

    let result = await collect(Observable.from(items).pipe(consensus(1)));
    expect(result).toEqual(items);
  });

  it('1 response per 2 providers', async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
    ];

    let result = await collect(Observable.from(items).pipe(consensus(2)));
    expect(result).toEqual(items.slice(0, 1));
  });

  it('2 responses per 2 providers', async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '2' }),
      createResponse({ id: '1' }),
      createResponse({ id: '2' }),
    ];

    let result = await collect(Observable.from(items).pipe(consensus(2)));
    expect(result).toEqual(items.slice(0, 2));
  });

  it('consensus with non full response', async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
    ];
    let result = await collect(Observable.from(items).pipe(consensus(5)));
    expect(result).toEqual(items.slice(0, 1));
  });

  it("can't reach consensus", async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
    ];
    return expect(
      collect(Observable.from(items).pipe(consensus(5)))
    ).rejects.toThrowError();
  });
  it("can't reach consensus on 1 of 2", async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
      createResponse({ id: '2' }),
    ];
    const spy = jest.fn();
    let cs = Observable.from(items).pipe(consensus(2));
    let expectErr: Error = new Error('');

    cs.subscribe({
      next(item) {
        spy(item);
      },
      error(err) {
        expectErr = err;
        spy(err);
      },
    });
    await wait(cs);
    expect(spy).toBeCalledWith(createResponse({ id: '1' }));
    expect(spy).toBeCalledWith(expectErr);
  });

  it("can't reach consensus because of different payloads", async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1' }),
      createResponse({ id: '1', payload: '0x100002' }),
    ];
    return expect(
      collect(Observable.from(items).pipe(consensus(3)))
    ).rejects.toThrowError();
  });

  it('the parallel consensus attempts', async () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1', payload: '0x100002' }),
      createResponse({ id: '1', payload: '0x100002' }),
    ];
    let result = await collect(Observable.from(items).pipe(consensus(9)));
    expect(result).toEqual(items.slice(1, 2));
  });

  it('handles unsubscribe correctly', () => {
    const items: JSONRPCResponse[] = [
      createResponse({ id: '1' }),
      createResponse({ id: '2' }),
    ];
    let spy = jest.fn();
    let obs = new Observable(() => {
      return () => spy();
    }).pipe(consensus(2));
    let sub = obs.subscribe({});
    unsubscribe(sub);
    expect(spy).toBeCalled();
  });
});
