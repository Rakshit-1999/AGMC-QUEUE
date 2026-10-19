// Public surface for pages: hooks, selectors, actions, boot. Pages never import from
// '@/sim/**' or '@/store/ops/**' and never call commit().
import { startTicker } from './clock';
import { startLeader } from './leader';
import { hydrateStore, startSync } from './sync';

// ---------- hooks & core ----------
export { useAppState, useLive, useHydrated, useIsLeader, shallowEqual } from './hooks';
export { useNow, simNow } from './clock';
export { useSession, useSessionStatus, homeFor, getSession } from './session';
export type { SessionInfo, SessionStatus } from './session';
export { getState } from './store';
export type { AppState } from './state';

/**
 * Boot sequence for main.tsx/boot.ts: start cross-tab sync, hydrate (or build the demo),
 * then start the 1-second ticker and leader election. Resolves once hydrated.
 */
export async function bootStore(): Promise<void> {
  startSync();
  await hydrateStore();
  startTicker();
  startLeader();
}
/** Fire-and-forget form of bootStore() (used by app/boot.ts); useHydrated() flips when ready. */
export function startRuntime(): void {
  void bootStore();
}
export { startSync, hydrateStore } from './sync';
export { startTicker } from './clock';
export { startLeader } from './leader';

// ---------- selectors ----------
export {
  selectBranch,
  selectBranchByCode,
  selectActiveBranches,
  selectAllBranches,
  selectAdvisorsOfBranch,
  selectProjection,
  selectServiceTypes,
  selectBrands,
  statusChip,
  typeChip,
  appointmentArrivalChip,
  notArrivedChip,
  advisorStateChip,
  advisorSourceLabel,
  deskTypeLabel,
  advisorSubtitle,
} from './selectors/common';
export type { Tone, ChipSpec, Kpi } from './selectors/common';

export { selectDemoAccounts } from './selectors/login';
export type { DemoAccountGroup } from './selectors/login';

export {
  selectReceptionKpis,
  selectReceptionHeading,
  selectCheckInList,
  selectPickAdvisorOptions,
  selectWalkInOptions,
  selectQueueRows,
  selectChangeAdvisorOptions,
  selectAdvisorCards,
  selectNotArrived,
  selectRecentlyFinished,
  selectIssuedTicket,
} from './selectors/reception';
export type {
  CheckInRow,
  QueueRowView,
  AdvisorCardView,
  IssuedTicketView,
  QuoteBoxView,
  WalkInOptionsView,
} from './selectors/reception';
export type { WalkInOptionRow, WalkInOptions, WalkInQuote } from '@/domain/queue/quote';
export type { Projection, ProjectedCall } from '@/domain/queue/project';

export { selectAdvisorDesk, selectTransferTargets } from './selectors/advisor';
export type { AdvisorDeskView, AdvisorDeskCard, VisitCardInfo, LineRow, MyDayRow } from './selectors/advisor';

export { selectGroupTotals, selectBranchCards } from './selectors/manager';
export type { BranchCardView } from './selectors/manager';

export {
  selectDashboardKpis,
  selectDashboardHeading,
  selectArrivalsByHour,
  selectAvgWaitByHour,
  selectDeskTimeByService,
  selectAdvisorsToday,
  selectLearning,
  selectActivity,
} from './selectors/dashboard';
export type { PromisesView, DeskTimesView, HourBucket } from './selectors/dashboard';

export {
  selectBranchesTable,
  selectAdvisorsTable,
  selectServiceTypesTable,
  selectBrandsText,
  selectUsersTable,
  selectKeyloopView,
  selectKeyloopHistoryRows,
  selectAuditLog,
  selectSimulatorView,
} from './selectors/settings';

export { selectTvView } from './selectors/tv';
export type { TvView, TvViewOk, TvCall, TvDesk } from './selectors/tv';

// ---------- actions ----------
export { signIn, signOut } from './actions/auth';
export {
  checkInAppointment,
  setBookingAdvisor,
  issueWalkIn,
  changeAdvisor,
  moveToFront,
  markNoShow,
  cancelTicket,
} from './actions/reception';
export type { IssueWalkInInput } from './actions/reception';
export {
  setAvailable,
  startBreak,
  goOffline,
  callNext,
  callAgain,
  startService,
  notHere,
  advisorNoShow,
  complete,
  transfer,
} from './actions/advisor';
export { saveBranch, saveAdvisor, saveServiceType, saveBrands, saveUser } from './actions/settings';
export type { BranchInput, AdvisorInput, ServiceTypeInput, UserInput } from './actions/settings';
export { setNightlyLoadTime, loadTomorrow, syncToday } from './actions/keyloop';
export { setSimulatorEnabled, resetDemo, setAdvisorDriver } from './actions/demo';

export { DEFAULT_RULES, BREAK_REASONS } from '@/domain/constants';
