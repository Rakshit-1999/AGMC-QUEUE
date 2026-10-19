import { useCallback, useSyncExternalStore } from 'react';

/** Live `matchMedia` result (used to switch the KPI row between 9 and 5 columns). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  const get = () => window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, get, get);
}
