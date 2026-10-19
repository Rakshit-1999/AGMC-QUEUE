// AppState re-export and the empty state used before hydration.
import { DEFAULT_NIGHTLY_LOAD_AT, DEMO_DATE, DEMO_SEED, DEMO_START, SCHEMA_VERSION } from '@/domain/constants';
import { atDubai } from '@/domain/time';
import type { AppState } from '@/domain/types';

export type { AppState } from '@/domain/types';

export function emptyState(): AppState {
  const anchor = atDubai(DEMO_DATE, DEMO_START);
  return {
    schemaVersion: SCHEMA_VERSION,
    rev: 0,
    writerId: '',
    today: DEMO_DATE,
    clock: { anchorSimMs: anchor, anchorRealMs: 0, speed: 1 },
    branches: {},
    branchOrder: [],
    advisors: {},
    services: {},
    serviceOrder: [],
    brands: [],
    users: {},
    visits: {},
    counters: { seq: 0 },
    audit: [],
    keyloop: {
      source: 'mock',
      nightlyLoadAt: DEFAULT_NIGHTLY_LOAD_AT,
      intradayEveryMin: 10,
      lastIntradayAt: null,
      days: {},
      history: [],
    },
    history: {},
    learning: {},
    simulator: { enabled: true, seed: DEMO_SEED, drivers: {}, demoStart: DEMO_START, stepSec: 1 },
    script: { seed: DEMO_SEED, appointments: {}, service: {}, walkIns: [], breaks: [], roster: [], sameDay: [] },
    lastProcessedAt: anchor,
  };
}
