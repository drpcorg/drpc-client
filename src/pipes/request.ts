import { JSONRPCResponse, ReplyItem, Request as DrpcRequest } from 'drpc-proxy';
import { Observable, ObservableLike, unsubscribe } from 'observable-fns';
import { failureKindFromNumber } from '../utils';

export function requestFinalization(request: DrpcRequest) {
  let requestsSeen: Set<string> = new Set();
  let providers: Map<string, number> = new Map(
    request.provider_ids.map((el) => [el, 0])
  );
  let expectedIds = new Set(request.rpc.map((rpc) => rpc.id));
  let fulFilledProviders: Set<string> = new Set();
  return (items: ObservableLike<ReplyItem>) => {
    return new Observable<ReplyItem>((obs) => {
      let sub = items.subscribe({
        next(item) {
          if (item.error) {
            switch (failureKindFromNumber(item.error.kind)) {
              case 'partial':
                fulFilledProviders = fulFilledProviders.add(item.provider_id);
                break;
              case 'total':
                obs.error(new Error(item.error.message));
                return;
            }
          } else {
            // Filter unexpected data
            if (!expectedIds.has(item.id)) {
              return;
            }
            if (!providers.has(item.provider_id)) {
              return;
            }
            // check duplicates
            let key = JSON.stringify([item.provider_id, item.id]);
            if (requestsSeen.has(key)) {
              return;
            }
            requestsSeen = requestsSeen.add(key);
            obs.next(item);
          }

          if (!fulFilledProviders.has(item.provider_id)) {
            // check if this item fulfills provider
            let receivedRequestsForProvider =
              providers.get(item.provider_id) || 0;
            if (receivedRequestsForProvider + 1 >= expectedIds.size) {
              fulFilledProviders = fulFilledProviders.add(item.provider_id);
            } else {
              providers = providers.set(
                item.provider_id,
                receivedRequestsForProvider + 1
              );
            }
          }

          if (fulFilledProviders.size >= request.provider_ids.length) {
            obs.complete();
          }
        },
        complete() {
          obs.complete();
        },
        error(err) {
          obs.error(err);
        },
      });
      return () => {
        unsubscribe(sub);
      };
    });
  };
}

export function requestTimeout(timeout: number, error: string) {
  return (items: ObservableLike<ReplyItem>) => {
    return new Observable<ReplyItem>((obs) => {
      let sub = items.subscribe({
        next(item) {
          obs.next(item);
        },
        error(err) {
          obs.error(err);
        },
        complete() {
          obs.complete();
        },
      });

      let timeoutRef: any = setTimeout(() => {
        obs.error(new Error(`Timeout: ${error}`));
      }, timeout);

      return () => {
        unsubscribe(sub);
        clearTimeout(timeoutRef);
      };
    });
  };
}

export function requestCompletness(request: DrpcRequest) {
  let expectedRequests = new Set(request.rpc.map((item) => item.id));
  let accumulatedRequests: Set<string> = new Set();
  return (items: ObservableLike<JSONRPCResponse>) => {
    return new Observable<JSONRPCResponse>((obs) => {
      let sub = items.subscribe({
        next(item) {
          if (!expectedRequests.has(item.id)) {
            return;
          }
          accumulatedRequests = accumulatedRequests.add(item.id);
          obs.next(item);
        },
        complete() {
          if (accumulatedRequests.size === expectedRequests.size) {
            obs.complete();
          } else {
            obs.error(
              new Error(
                'Partial request results, not enough data received or errors happened'
              )
            );
          }
        },
        error(err) {
          obs.error(err);
        },
      });
      return () => {
        unsubscribe(sub);
      };
    });
  };
}
