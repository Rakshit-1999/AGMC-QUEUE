import { startRuntime } from '@/store';

let booted = false;

/**
 * App boot (ARCHITECTURE §1.2 app/boot.ts): hydrate the store, start cross-tab sync,
 * leader election and the 1-second ticker. The runtime itself is FB's (`@/store`); FA only calls it once.
 */
export function boot(): void {
  if (booted) return;
  booted = true;
  startRuntime();
}
