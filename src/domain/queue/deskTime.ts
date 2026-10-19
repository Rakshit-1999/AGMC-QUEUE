// Expected desk minutes: configured -> learned (shrunk) -> advisor pace.
import { PRIOR_WEIGHT_VISITS } from '../constants';
import type { AdvisorId, AppState, BranchId, BrandCode, ServiceCode } from '../types';

/** Shrink a measured value toward a prior: (prior·K + x·n) / (K + n). */
export function shrinkToward(prior: number, x: number, n: number, k: number = PRIOR_WEIGHT_VISITS): number {
  if (n <= 0) return prior;
  return (prior * k + x * n) / (k + n);
}

/** Advisor pace factor shrunk toward 1. */
export function shrinkFactor(ratio: number, n: number, k: number = PRIOR_WEIGHT_VISITS): number {
  return shrinkToward(1, ratio, n, k);
}

/**
 * Expected minutes at the desk for a service/brand, optionally for one advisor.
 * learnDays === 0: configured minutes. Otherwise the learning snapshot's "now using"
 * (brand-specific when measured), multiplied by the advisor's shrunk pace factor.
 */
export function expectedDeskMin(
  s: AppState,
  branchId: BranchId,
  serviceCode: ServiceCode,
  brand: BrandCode,
  advisorId: AdvisorId | null,
): number {
  const svc = s.services[serviceCode];
  const configured = svc?.expectedMin ?? 15;
  const branch = s.branches[branchId];
  if (!branch || branch.rules.learnDays === 0) return configured;
  const snap = s.learning[branchId];
  const learned = snap?.services[serviceCode];
  if (!snap || snap.windowDays === 0 || !learned) return configured;
  let base = learned.nowUsingMin;
  const byBrand = learned.byBrand[brand];
  if (byBrand && byBrand.visits > 0) base = shrinkToward(base, byBrand.measuredMin, byBrand.visits);
  if (advisorId) {
    const adv = snap.advisors[advisorId]?.[serviceCode];
    if (adv) base *= adv.factor;
  }
  return base;
}
