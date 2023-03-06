import { Observable, ObservableLike, unsubscribe } from 'observable-fns';
import {
  JSONRPCResponse,
  Request as DrpcRequest,
  ReplyItem,
  JSONRPCRequest,
} from '@drpcorg/drpc-proxy';
import { failureKindFromNumber } from '../utils';

function hasConsensus(collection: Array<ReplyItem>, quorumOf: number) {
  return quorumOf <= collection.length;
}

function getConsensusError(
  collection: { [hash: string]: Array<ReplyItem> },
  quorumOf: number
) {
  let errors = Object.keys(collection).map((hash) => {
    let items = collection[hash];

    return `Received ${items.length} replies with payload ${hash}`;
  });

  return `Expected consensus of ${quorumOf}:\n${errors.join(`\n`)}`;
}

/**
 * This error is thrown when we couldn't find a consensus between different providers
 * on a given request
 */
export class ConsensusError extends Error {
  constructor(msg: string) {
    super(`Consensus failure, response is not trustworthy: ${msg}`);
  }
}

export class RequestsCompletionError extends Error {
  constructor(msg: string) {
    super(`Requests completion failure: ${msg}`);
  }
}

export function consensus(requests: JSONRPCRequest[], quorumOf: number) {
  return (items: ObservableLike<ReplyItem>): Observable<ReplyItem> => {
    // Request completeness
    // let expectedRequests = new Set(request.rpc.map((item) => item.id));
    // let accumulatedRequests: Set<string> = new Set();

    // Consensus is reached when we have at least quorumOf responses for a given request
    // let accumulator: { [id: string]: { [hash: string]: Array<ReplyItem> }; } = {};
    let accumulator: { [id: string]: { [hash: string]: Array<ReplyItem> } } =
      {};
    // let consensus: { [id: string]: boolean } = {};
    let consensus = new Map<string, boolean>(
      requests.map((rpc) => [rpc.id, false])
    );

    // Accumulate partial errors
    let accumulatorPartialError: { [id: string]: string[] } = {};

    return new Observable<ReplyItem>((obs) => {
      let sub = items.subscribe({
        next(item) {
          // Check if item has partial error
          if (item.error) {
            let kind = failureKindFromNumber(item.error.kind);

            if (kind === 'total') {
              obs.error(new Error(item.error.message));
              return;
            }

            let message = item.error.message || 'Unknown partial error';
            let partialErrorMessage = `Item id ${item.id}: ${message}`;

            item.error.item_ids?.forEach((item_id) => {
              if (!accumulatorPartialError[item_id]) {
                accumulatorPartialError[item_id] = [];
              }
              accumulatorPartialError[item_id].push(partialErrorMessage);
            });

            return;
          }

          // Check that item is expected
          if (
            !item.id ||
            !consensus.has(item.id) ||
            item.result === undefined
          ) {
            return;
          }

          if (!accumulator[item.id]) {
            accumulator[item.id] = {};
          }

          let key = JSON.stringify(item.result.payload);
          if (!accumulator[item.id][key]) {
            accumulator[item.id][key] = [];
          }

          accumulator[item.id][key].push(item);

          if (hasConsensus(accumulator[item.id][key], quorumOf)) {
            obs.next(accumulator[item.id][key][0]);
            consensus.set(item.id, true);
          }
        },
        complete() {
          let consensumValues = Array.from(consensus.values());
          let completeConsensus = consensumValues.every((el) => el);

          let partialErrorsMessage = Object.entries(accumulatorPartialError)
            .filter((el) => {
              let id = el[0];
              // Return only those that don't have consensus
              return !consensus.get(id);
            })
            .map((el) => {
              let id = el[0];
              let errors = el[1];
              return `id ${id}: ${errors.join(', ')}`;
            })
            .join(', ');

          if (!completeConsensus) {
            let reasons = Array.from(consensus.entries())
              .filter((el) => {
                let hasConsensus = el[1];
                // Return only those that don't have consensus
                return !hasConsensus;
              })
              .map((el) => {
                let id = el[0];

                let error;

                if (!accumulator[id]) {
                  error = 'No responses received';
                } else {
                  error = getConsensusError(accumulator[id], quorumOf);
                }

                return `For request ${id}:\n${error}`;
              })
              .join('\n\n');

            let message = `Unable to reach consensus.\n${reasons}`;

            if (partialErrorsMessage) {
              message = `${message}. Errors occured: ${partialErrorsMessage}`;
            }

            obs.error(new ConsensusError(message));
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
