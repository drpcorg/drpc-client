import {
  JSONRPCResponse,
  ReplyItem,
  Request as DrpcRequest,
} from '@drpcorg/drpc-proxy';
import { Observable, ObservableLike, unsubscribe } from 'observable-fns';
import { failureKindFromNumber } from '../utils';

export function requestFinalization(request: DrpcRequest) {
  let requestsRepliesMap = new Map<string, Set<string>>(
    request.rpc.map((rpc) => [rpc.id, new Set()])
  );
  let quorum = request.quorum || 1;

  return (items: ObservableLike<ReplyItem>) => {
    return new Observable<ReplyItem>((obs) => {
      let sub = items.subscribe({
        next(item) {
          if (item.error) {
            let kind = failureKindFromNumber(item.error.kind);

            switch (kind) {
              case 'partial': {
                let item_ids = item.error.item_ids || [];

                // Handle item_ids with partial error normally as if they were okay
                for (let id of item_ids) {
                  let existingSet = requestsRepliesMap.get(id) || new Set();
                  let newSet = existingSet.add(item.provider_id);
                  requestsRepliesMap.set(id, newSet);
                }

                // Pass the partial error to consensus pipe
                obs.next(item);

                break;
              }
              case 'total': {
                obs.error(new Error(item.error.message));
                break;
              }
              default: {
                obs.error(new Error(`Unknown item error kind`));
              }
            }
          } else {
            if (!item.id || !requestsRepliesMap.get(item.id)) {
              obs.error(new Error('No item id or unexpected item id'));
            } else {
              // Condition to handle item normally and pass it to consensus pipe
              let existingSet = requestsRepliesMap.get(item.id) || new Set();
              if (!existingSet.has(item.provider_id)) {
                obs.next(item);
              }

              requestsRepliesMap.set(
                item.id,
                existingSet.add(item.provider_id)
              );
            }
          }

          // Decide if complete
          let setsArray = Array.from(requestsRepliesMap.values());
          let quorumFulfilled = setsArray.every((s) => s.size >= quorum);

          if (quorumFulfilled) {
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
