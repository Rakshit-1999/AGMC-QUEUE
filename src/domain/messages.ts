// All user-visible copy defined by docs/SPEC.md. Pages and ops use these constants;
// never retype the copy.
import type {
  AdvisorLiveState,
  AppointmentAdvisorMode,
  DeskType,
  NextReasonCode,
  Role,
  VisitStatus,
} from './types';

/** Problem messages (clay toasts), verbatim from SPEC "Problem messages". */
export const ERR = {
  // Sign in and access
  wrongCredentials: 'Wrong username or password',
  signInAgain: 'Please sign in again.',
  roleCannotOpen: 'Your role cannot open this',
  notYourBranch: 'Not your branch',
  notLinkedToAdvisor: 'This account is not linked to an advisor',
  // Reception
  onlyBookedCheckIn: 'Only a booked appointment can be checked in',
  notForToday: 'This appointment is not for today',
  giveReason: 'Give a reason — every override is logged',
  appointmentsKeepSlot: 'Appointments keep their slot — change its advisor instead',
  onlyWaitingToFront: 'Only a waiting ticket can be moved to the front',
  onlyWaitingOrBookedMove: 'Only a waiting or booked ticket can be moved',
  cannotCancel: 'This ticket can no longer be cancelled',
  cannotNoShow: 'This ticket can no longer be marked as a no-show',
  advisorNotInBranch: 'Advisor not in this branch',
  unknownService: 'Unknown service type',
  noAdvisorCanTake: 'No advisor can take this now',
  // Advisor desk
  setAvailableFirst: 'Set yourself Available first',
  finishCurrentFirst: 'Finish your current customer first',
  nobodyWaiting: 'Nobody is waiting for you right now',
  noCustomerInState: 'No customer in that state at your desk',
  finishOrTransferFirst: 'Finish or transfer your current customer first',
  // Settings
  branchCodeExists: 'A branch with that code exists',
  codeLettersDigits: 'Code: letters and digits only',
  openingHours: 'Opening hours must be HH:MM and open before close',
  timeHHMM: 'Time must be HH:MM',
  receptionPassword: 'Reception password: at least 8 characters',
  password: 'Password: at least 8 characters',
  username: 'Username: 3–64 of a-z 0-9 . _ -',
  usernameTaken: 'That username is taken',
  branchRequired: 'Reception and advisor accounts belong to a branch',
  pickAdvisor: 'Pick the advisor this login belongs to',
  advisorServing: 'This advisor is serving someone — move them after',
  ownManagerAccess: 'You cannot remove your own manager access',
  serviceCodeExists: 'A service type with that code exists',
  keepOneBrand: 'Keep at least one brand',
} as const;

export type ErrKey = keyof typeof ERR;

/** Success messages (dark toasts), verbatim from SPEC "Success messages". */
export const OK = {
  // Reception
  advisorChanged: 'Advisor changed',
  movedToFront: 'Moved to the front',
  markedNoShow: 'Marked as no-show',
  ticketCancelled: 'Ticket cancelled',
  // Advisor
  available: "You're available",
  breakStarted: 'Enjoy your break',
  offline: 'Signed off the queue',
  calling: (ticketNo: string): string => `Calling ${ticketNo}`,
  started: 'Started',
  calledAgain: 'Called again',
  backInQueue: 'Back in the queue',
  done: 'Done — nice work',
  transferred: 'Transferred',
  // Settings
  branchAdded: 'Branch added',
  advisorAdded: 'Advisor added',
  saved: 'Saved',
  brandsSaved: 'Brands saved',
  tomorrowLoaded: "Tomorrow's bookings loaded",
  todaySynced: 'Today synced',
  simulatorOn: 'Simulator on',
  simulatorOff: 'Simulator off',
  demoReplayed: "Today's demo replayed",
} as const;

/** SPEC "Why this customer is next". */
export const REASON_TEXT: Readonly<Record<NextReasonCode, string>> = {
  handover: 'Handed over to you by a colleague',
  ceiling: 'Walk-in at the hard ceiling',
  own_appt_due: 'Your appointment is due',
  cover_appt: "Another advisor's appointment is waiting",
  bumped: 'Moved to the front by reception',
  over_cap: 'Walk-in over the wait cap',
  cover_walkin: "Covering a colleague's walk-in so we keep the time we told them",
  fits: 'Walk-in that fits before your next appointment',
  early_appt: 'Appointment arrived early',
};

export const STATUS_TEXT: Readonly<Record<VisitStatus, string>> = {
  booked: 'Booked',
  waiting: 'Waiting',
  called: 'Called',
  serving: 'With advisor',
  done: 'Done',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

export const ADVISOR_STATE_TEXT: Readonly<Record<AdvisorLiveState, string>> = {
  serving: 'Serving',
  calling: 'Calling',
  available: 'Available',
  break: 'On break',
  offline: 'Offline',
};

export const DESK_TYPE_TEXT: Readonly<Record<DeskType, string>> = {
  all: 'All customers',
  appointments_only: 'Appointments only',
  walkin_desk: 'Walk-in desk',
  express_desk: 'Express desk',
};

export const ROLE_TEXT: Readonly<Record<Role, 'Manager' | 'Reception' | 'Service advisor'>> = {
  manager: 'Manager',
  reception: 'Reception',
  advisor: 'Service advisor',
};

/** Users table role labels. */
export const ROLE_SCOPE_TEXT: Readonly<Record<Role, string>> = {
  manager: 'Manager — all branches',
  reception: 'Reception — one branch',
  advisor: 'Service advisor — own desk',
};

export const ADVISOR_MODE_TEXT: Readonly<Record<AppointmentAdvisorMode, string>> = {
  keyloop_else_allocate: "Keyloop's advisor if the booking names one, otherwise the system allocates",
  allocate_all: 'The system allocates every appointment (balanced by skills and load)',
  reception_picks: 'Left open: reception picks the advisor at check-in',
};

/** Short form of the advisor mode for the Keyloop "Bookings per branch" table. */
export const ADVISOR_MODE_SHORT: Readonly<Record<AppointmentAdvisorMode, string>> = {
  keyloop_else_allocate: 'Keyloop, else allocated',
  allocate_all: 'Allocated',
  reception_picks: 'Picked at reception',
};

/** Fixed labels and copy that more than one page or selector uses. */
export const LABEL = {
  walkInCustomer: 'Walk-in customer',
  whoeverFree: 'Whoever is free first',
  firstFreeAdvisor: 'The first free advisor',
  nextFreeAdvisor: 'Next free advisor',
  noAdvisorYet: 'no advisor yet',
  noAdvisorAvailable: 'No advisor available',
  statusLockedTooltip: 'Finish or transfer your customer first',
  nothingNeedsAttention: 'Nothing needs attention',
  soonest: 'Soonest',
  tellTheCustomer: 'Tell the customer',
  afterClosing: 'Would finish after closing — offer a drop-off or a booking.',
  longWait: 'Long wait — offer to leave the car (drop-off) or book a slot.',
  noAdvisorCanTake: 'No advisor can take this now',
  lateNotice: 'Arrived after the grace window — queues as a walk-in.',
  tvEmpty: 'Please wait — you will be called shortly',
  tvExplain: 'Appointments are called at their booked time; walk-ins in order of arrival between them.',
  tvUnknownBranch: 'Unknown branch',
  tvInactiveBranch: 'This branch is inactive',
  learningOff: 'Learning is off for this branch (Settings › Branches)',
  deskTimesFootnote:
    "Each figure starts at the configured minutes and moves toward what was measured as visits pile up; an advisor's own pace is used once they call a customer.",
  awayLine: "While you're away, your appointments that come due can be served by a colleague.",
  simulator: 'simulator',
  system: 'system',
  none: 'none',
  all: 'All',
  allBranches: 'All branches',
  off: 'off',
  dash: '—',
} as const;

/** "<n> advisor(s) present; none handles this brand/service." */
export function noneHandlesLine(presentCount: number): string {
  return `${presentCount} advisor(s) present; none handles this brand/service.`;
}

export function customerName(name: string | null): string {
  return name && name.trim() ? name : LABEL.walkInCustomer;
}
