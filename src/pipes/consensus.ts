import { Observable, ObservableLike, unsubscribe } from 'observable-fns';
import { JSONRPCResponse, ReplyItem } from '@drpcorg/drpc-proxy';

function hasConsensus(collection: JSONRPCResponse[], total: number): boolean {
  return Math.floor((2 * total) / 3) + 1 <= collection.length;
}

/**
 * This error is thrown when we couldn't find a consensus between different providers
 * on a given request
 */
export class ConsensusError extends Error {
  constructor(msg: string) {
    super(`Consensus failure: ${msg}, response is not trustworthy`);
  }
}

export function consensus(total: number) {
  return (
    items: ObservableLike<JSONRPCResponse>
  ): Observable<JSONRPCResponse> => {
    let accumulator: { [id: string]: { [hash: string]: JSONRPCResponse[] } } =
      {};
    let consensus: { [id: string]: boolean } = {};
    return new Observable<JSONRPCResponse>((obs) => {
      let sub = items.subscribe({
        next(item) {
          if (!accumulator[item.id]) {
            consensus[item.id] = false;
            accumulator[item.id] = {};
          }
          let key = JSON.stringify(item.payload);
          if (!accumulator[item.id][key]) {
            accumulator[item.id][key] = [];
          }
          accumulator[item.id][key].push(item);
          if (hasConsensus(accumulator[item.id][key], total)) {
            obs.next(accumulator[item.id][key][0]);
            consensus[item.id] = true;
          }
        },
        complete() {
          const complete = Object.entries(consensus).every((el) => el[1]);
          if (!complete) {
            obs.error(new ConsensusError('Unable to reach consensus'));
          } else {
            obs.complete();
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
