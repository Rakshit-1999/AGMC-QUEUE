// Demo actions (manager only; prototype only).
import { OK } from '@/domain/messages';
import type { ActionResult, AdvisorId, Driver } from '@/domain/types';
import { buildDemoState } from '@/sim/replay';
import { fail, ok, pushAudit } from '../ops/audit';
import { commit } from '../store';
import { requireManager } from './authz';

export function setSimulatorEnabled(on: boolean): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => {
    d.simulator.enabled = on;
    ctx.audit({ branchId: null, what: 'simulator', detail: on ? OK.simulatorOn : OK.simulatorOff });
    return ok();
  }, auth.value.username);
}

/**
 * Wipes today's tickets and replays the day from opening time to demoStart, re-anchoring the clock.
 * Keeps the simulator on/off switch and 'person' drivers (advisors signed in in some tab).
 */
export function resetDemo(): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  const who = auth.value.username;
  return commit((d) => {
    const fresh = buildDemoState(d.simulator.seed, Date.now());
    fresh.simulator.enabled = d.simulator.enabled;
    for (const [id, driver] of Object.entries(d.simulator.drivers)) {
      if (driver === 'person' && fresh.advisors[id]) {
        fresh.simulator.drivers[id] = 'person';
        const a = fresh.advisors[id];
        if (a.presence === 'offline') a.presence = 'available';
      }
    }
    const rev = d.rev;
    Object.assign(d, fresh);
    d.rev = rev;
    pushAudit(d, d.clock.anchorSimMs, who, { branchId: null, what: 'simulator', detail: OK.demoReplayed });
    return ok();
  }, who);
}

export function setAdvisorDriver(advisorId: AdvisorId, driver: Driver): ActionResult {
  const auth = requireManager();
  if (!auth.ok) return fail(auth.error);
  return commit((d, ctx) => {
    const a = d.advisors[advisorId];
    if (!a) return ok();
    d.simulator.drivers[advisorId] = driver;
    ctx.audit({ branchId: a.branchId, what: 'simulator', detail: `${a.name}: ${driver === 'sim' ? 'Simulator' : 'A person'}` });
    return ok();
  }, auth.value.username);
}
