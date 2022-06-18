import { Observable } from 'observable-fns';

export function initNonce(): number {
  return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER / 2));
}

export function collect<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise((res, rej) => {
    obs
      .reduce((acc, item) => acc.concat([item]), [] as T[])
      .subscribe({
        next(data) {
          res(data);
        },
        error(err) {
          rej(err);
        },
      });
  });
}

export function shuffleArray(arr: any[]) {
  let array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function wait<T>(obs: Observable<T>): Promise<void> {
  return new Promise((res) => {
    obs.subscribe({
      complete() {
        res();
      },
      error() {
        res();
      },
    });
  });
}

export type FailureKind = 'total' | 'partial';
export function failureKindFromNumber(num: number): FailureKind {
  switch (num) {
    case 0:
      return 'total';
    case 1:
      return 'partial';
  }
  throw new Error('Unexpected failure kind');
}
export function failureKindToNumber(kind: FailureKind): number {
  switch (kind) {
    case 'total':
      return 0;
    case 'partial':
      return 1;
  }
}
