import { shallowEqual } from '@/store';

/**
 * Equality for selector results that are arrays of flat row objects: same length and each row shallow-equal.
 * Lets `useAppState` skip re-renders when a store change does not touch these rows.
 */
export function rowsEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a === b || (a.length === b.length && a.every((row, i) => shallowEqual(row, b[i])));
}
