import {
  requestCompletness,
  requestFinalization,
  requestTimeout,
} from '../../../src/pipes/request';
import {
  JSONRPCResponse,
  ReplyItem,
  Request as DrpcRequest,
} from '@drpcorg/drpc-proxy';
import { Observable, unsubscribe } from 'observable-fns';
import { collect, failureKindToNumber } from '../../../src/utils';
import { jest, expect } from '@jest/globals';

const defaultReply: ReplyItem = {
  id: '450359962737049540',
  request_id: 'test11',
  provider_id: 'test',
  result: {
    errorCode: 0,
    payload: '0x100001',
    signature:
      '3046022100ae2ba14dfa05ad7e6b77d2ead0800420fe61cfe607f49b79e698d5f25550d34022100f220549234a1b15ec437a41814d463a7de1e93fd90292e28671c8e84c041b8d9',
    nonce: 450359962737049540,
    id: '450359962737049540',
    upstream_id: 'test-2',
    error: '',
    ok: true,
  },
};

const defaultRequest: DrpcRequest = {
  id: '450359962737049540',
  dkey: '',
  provider_ids: ['test'],
  rpc: [
    {
      id: '450359962737049540',
      nonce: 450359962737049540,
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
    },
  ],
  network: 'ethereum',
};

function createRequest(req: Partial<DrpcRequest> = {}): DrpcRequest {
  return { ...defaultRequest, ...req };
}

function createReply(reply: Partial<ReplyItem> = {}): ReplyItem {
  return { ...defaultReply, ...reply };
}

function timeout(ms: number) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

describe('Request', () => {
  describe('finalization', () => {
    it('deduplicates responses', async () => {
      let result = await collect(
        Observable.from([createReply(), createReply()]).pipe(
          requestFinalization(createRequest())
        )
      );
      expect(result).toEqual([createReply()]);
    });

    it('handles unsubscribe', async () => {
      let spy = jest.fn();
      let obs = new Observable(() => {
        return spy;
      })
        .pipe(requestFinalization(createRequest()))
        .subscribe({});

      unsubscribe(obs);
      expect(spy).toHaveBeenCalled();
    });

    it('completes stream when all responses were seen', async () => {
      let request = createRequest({
        provider_ids: ['test1', 'test2'],
      });
      let data = [
        createReply({ provider_id: 'test1' }),
        createReply({ provider_id: 'test2' }),
      ];
      let result = await collect(
        new Observable((obs) => {
          data.forEach((item) => obs.next(item));
        }).pipe(requestFinalization(request))
      );
      expect(result).toEqual(data);
    });

    it('filters out requests I do not asked for', async () => {
      let request = createRequest({
        provider_ids: ['test1', 'test2'],
      });
      let data = [
        createReply({ provider_id: 'test1' }),
        createReply({
          provider_id: 'test1',
          id: '3434',
          result: {
            ...(defaultReply.result as JSONRPCResponse),
            id: '3434',
          },
        }),
      ];
      let spy = jest.fn();
      let response = new Observable((obs) => {
        data.forEach((item) => obs.next(item));
      })
        .pipe(requestFinalization(request))
        .subscribe({ next: spy, complete: spy });
      await timeout(50);
      expect(spy).toBeCalledWith(createReply({ provider_id: 'test1' }));
      expect(spy).toBeCalledTimes(1);
    });

    it('handles partial failure', async () => {
      let request = createRequest({
        provider_ids: ['test1', 'test2'],
      });
      let data = [
        createReply({ provider_id: 'test1' }),
        createReply({
          provider_id: 'test2',
          error: {
            kind: failureKindToNumber('partial'),
            code: 0,
            item_ids: [],
            message: 'test',
          },
        }),
      ];
      let result = await collect(
        new Observable((obs) => {
          data.forEach((item) => obs.next(item));
        }).pipe(requestFinalization(request))
      );
      expect(result).toEqual([createReply({ provider_id: 'test1' })]);
    });

    it('handles total failure', async () => {
      let request = createRequest({
        provider_ids: ['test1', 'test2'],
      });
      let data = [
        createReply({
          provider_id: 'test2',
          error: {
            item_ids: [],
            kind: failureKindToNumber('total'),
            code: 0,
            message: 'test',
          },
        }),
      ];
      let result = collect(
        new Observable((obs) => {
          data.forEach((item) => obs.next(item));
        }).pipe(requestFinalization(request))
      );
      expect(result).rejects.toMatchInlineSnapshot(`[Error: test]`);
    });
  });

  describe('completness', () => {
    it('handles unsubscription', () => {
      let spy = jest.fn();
      let sub = new Observable(() => {
        return spy;
      })
        .pipe(requestCompletness(createRequest()))
        .subscribe({});
      unsubscribe(sub);
      expect(spy).toHaveBeenCalled();
    });

    it('filters unexpected requests', async () => {
      let results = await collect(
        Observable.from([
          { ...(createReply().result as JSONRPCResponse), id: '23232323' },
          createReply().result as JSONRPCResponse,
        ]).pipe(requestCompletness(createRequest()))
      );
      expect(results).toEqual(results);
    });

    it('walks happy path', async () => {
      let results = await collect(
        Observable.from([createReply().result as JSONRPCResponse]).pipe(
          requestCompletness(createRequest())
        )
      );
      expect(results).toEqual(results);
    });

    it("errors when haven't seen any data on some requests", async () => {
      return expect(
        collect(Observable.from([]).pipe(requestCompletness(createRequest())))
      ).rejects.toThrowError(/Partial request results/);
    });
  });

  describe('timeout', () => {
    it('handles unsubscription', () => {
      let spy = jest.fn();
      let sub = new Observable(() => {
        return spy;
      })
        .pipe(requestTimeout(100, 'test error'))
        .subscribe({});
      unsubscribe(sub);
      expect(spy).toHaveBeenCalled();
    });

    it('completes normally', async () => {
      let result = await collect(
        new Observable((obs) => {
          setTimeout(() => {
            obs.next(createReply());
            obs.complete();
          }, 50);
        }).pipe(requestTimeout(100, 'test error'))
      );
      expect(result).toEqual([createReply()]);
    });

    it('errors with timeout', async () => {
      expect(
        collect(new Observable(() => {}).pipe(requestTimeout(50, 'test error')))
      ).rejects.toThrowError(/test error/);
    });
  });
});
