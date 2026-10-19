// Domain model for AGMC Queue. See docs/ARCHITECTURE.md section 2.
// Pure types only: no runtime code.

// ---------- primitives ----------
export type EpochMs = number; // absolute instant (UTC ms). Display always via time.ts (Dubai).
export type DateKey = string; // 'YYYY-MM-DD' in Dubai time, e.g. '2026-10-19'
export type HHMM = string; // '07:30' (24h, Dubai)
export type BranchId = string; // stable slug, never changes: 'szr', 'mc'
export type AdvisorId = string; // 'adv_omar_szr'
export type VisitId = string; // 'v_000123' (deterministic counter)
export type ServiceCode = string; // 'SVC' | 'STD' | 'COL' ...
export type BrandCode = string; // 'BMW' | 'MINI' | 'BMWi' ...
export type Username = string; // 'omar.szr'

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string }; // error is always a string from ERR (SPEC "Problem messages")

// ---------- branch & rules ----------
export interface QueueRules {
  earlyWindowMin: number; // default 10
  graceMin: number; // default 15
  walkInCapMin: number; // default 15
  hardCeilingMin: number; // default 25, 0 = off
  safetyBufferMin: number; // default 5
  helpAfterMin: number; // default 10
  swapAdvisorMin: number; // default 10, 0 = only at the time told or the ceiling
  onTimeTargetMin: number; // default 5
  learnDays: number; // default 28, 0 = configured minutes + fixed 20% margin
  promiseTargetPct: number; // default 80
}

export type AppointmentAdvisorMode =
  | 'keyloop_else_allocate' // "Keyloop's advisor if the booking names one, otherwise the system allocates"
  | 'allocate_all' // "The system allocates every appointment (balanced by skills and load)"
  | 'reception_picks'; // "Left open: reception picks the advisor at check-in"

export interface Branch {
  id: BranchId;
  code: string; // 'SZR', letters+digits, unique (case-insensitive); used by /display/<code>
  name: string; // 'Main Branch (SZR)'
  opensAt: HHMM;
  closesAt: HHMM;
  active: boolean;
  appointmentAdvisorMode: AppointmentAdvisorMode;
  rules: QueueRules;
  createdAt: EpochMs;
}

// ---------- advisors ----------
export type DeskType = 'all' | 'appointments_only' | 'walkin_desk' | 'express_desk';
export type AdvisorPresence = 'available' | 'break' | 'offline'; // what the advisor set
export type AdvisorLiveState = 'serving' | 'calling' | 'available' | 'break' | 'offline'; // derived
export type BreakReason = 'Coffee' | 'Prayer' | 'Lunch' | 'Workshop' | 'Meeting';

export interface Advisor {
  id: AdvisorId;
  branchId: BranchId;
  name: string; // 'Omar Haddad'
  desk: string; // 'Desk 1' (TV shows "→ Desk 1")
  deskType: DeskType;
  brands: BrandCode[]; // [] = every brand
  services: ServiceCode[]; // [] = every service
  active: boolean;
  presence: AdvisorPresence;
  breakReason: BreakReason | null;
  presenceSince: EpochMs; // when presence/breakReason last changed
  username: Username | null; // linked login, or null ("none")
}

// ---------- services & brands ----------
export interface ServiceType {
  code: ServiceCode; // locked after creation
  name: string; // 'Service'
  expectedMin: number; // configured desk minutes (25 / 15 / 8)
  expressLane: boolean; // Collection = true
  ticketLetter: string | null; // 'C' or null (null = A for appointments / W for walk-ins)
  active: boolean;
}
export type Brand = BrandCode; // brands are a plain ordered list in state: ['BMW','MINI','BMWi']

// ---------- users & session ----------
export type Role = 'manager' | 'reception' | 'advisor';
export interface User {
  username: Username; // locked after creation
  name: string; // 'Aftersales Manager', 'Reception', 'Omar Haddad'
  role: Role;
  branchId: BranchId | null; // required for reception + advisor, null for manager
  advisorId: AdvisorId | null; // required for advisor
  password: string; // PROTOTYPE ONLY: plaintext mock credential, see section 10
  canSignIn: boolean; // false = "Blocked"
  createdAt: EpochMs;
}
export interface Session {
  // per tab, sessionStorage; never shared across tabs
  username: Username;
  signedInAt: EpochMs;
}

// ---------- visits (a booking and/or a ticket) ----------
export type VisitKind = 'appointment' | 'walk_in';
export type VisitStatus = 'booked' | 'waiting' | 'called' | 'serving' | 'done' | 'no_show' | 'cancelled';
export type AdvisorSource =
  | 'keyloop' // "(booked in Keyloop)"
  | 'allocated' // "(allocated)"
  | 'reception' // "(picked at reception)" - appointment advisor picked/changed at reception
  | 'issue' // walk-in: advisor chosen when the ticket was issued
  | 'reassigned' // walk-in moved with "Change advisor" -> "Assigned → <name>"
  | 'handover'; // transferred by a colleague      -> "Assigned → <name>"

export interface Customer {
  name: string | null; // null -> "Walk-in customer"
  mobile: string; // '+971 50 123 4567' ('' allowed for walk-ins)
  plate: string; // 'Dubai X 75542'
  vehicle: string; // 'X6 M60i' (brand shown separately)
}

export interface Booking {
  // only for kind === 'appointment'
  keyloopRef: string; // 'KL-SZR-1019-030'
  slotAt: EpochMs;
  keyloopAdvisorId: AdvisorId | null; // advisor named by Keyloop, if any
  importedAt: EpochMs;
  syncId: string; // KeyloopSync.id that created/last updated it
}

export interface Quote {
  // what reception told the customer (walk-ins and appointments)
  issuedAt: EpochMs;
  advisorId: AdvisorId | null; // null = "Whoever is free first"
  forecastMin: number; // raw projection minutes (int)
  marginPct: number; // learned or fixed 20
  quotedMin: number; // "About N min" (ceil to 5, min 5)
  toldBy: EpochMs; // issuedAt + quotedMin -> "called by HH:MM"
  sampleSize: number; // walk-ins learned from
  afterClosing: boolean; // est. finish after branch close
}

export interface CallEvent {
  at: EpochMs;
  advisorId: AdvisorId;
  reason: NextReasonCode;
}

export interface Visit {
  id: VisitId;
  branchId: BranchId;
  date: DateKey;
  kind: VisitKind;
  status: VisitStatus;
  ticketNo: string | null; // 'A-014' / 'W-018' / 'C-004', assigned at check-in/issue
  customer: Customer;
  brand: BrandCode;
  serviceCode: ServiceCode;
  booking: Booking | null;
  advisorId: AdvisorId | null; // whose line it is in; null = "Whoever is free first" / "no advisor yet"
  advisorSource: AdvisorSource | null;
  lateAsWalkIn: boolean; // appointment that arrived after slot + grace (or after auto no-show)
  arrivedAt: EpochMs | null; // check-in / issue time
  quote: Quote | null;
  receptionNote: string; // walk-in "Note" field
  priorNotes: string[]; // "Notes the reception or earlier visits left" (mock)
  visitNote: string; // advisor "Note for this visit", saved on Complete
  bump: { at: EpochMs; by: Username; reason: string } | null; // Move to front
  handover: { at: EpochMs; fromAdvisorId: AdvisorId; toAdvisorId: AdvisorId | null; reason: string } | null;
  calls: CallEvent[]; // current call cycle (cleared by "Not here" and by transfer)
  firstCalledAt: EpochMs | null; // first call ever (used for promises kept, on-time, wait charts)
  calledBy: AdvisorId | null; // advisor of the current call
  startedAt: EpochMs | null; // "WITH YOU SINCE"
  servedBy: AdvisorId | null;
  endedAt: EpochMs | null; // done / no_show / cancelled time
  endReason: string; // cancel reason, no-show source, etc.
}

// Derived (never stored): queuesAsWalkIn(v) = v.kind === 'walk_in' || v.lateAsWalkIn

// ---------- next-customer reasons ----------
export type NextReasonCode =
  | 'handover' // Handed over to you by a colleague
  | 'ceiling' // Walk-in at the hard ceiling
  | 'own_appt_due' // Your appointment is due
  | 'cover_appt' // Another advisor's appointment is waiting
  | 'bumped' // Moved to the front by reception
  | 'over_cap' // Walk-in over the wait cap
  | 'cover_walkin' // Covering a colleague's walk-in so we keep the time we told them
  | 'fits' // Walk-in that fits before your next appointment
  | 'early_appt'; // Appointment arrived early

// ---------- audit ----------
export type Who = Username | 'simulator' | 'system';
export type AuditWhat =
  | 'sign in'
  | 'sign out'
  | 'check in'
  | 'walk in'
  | 'call'
  | 'call again'
  | 'start'
  | 'not here'
  | 'complete'
  | 'transfer'
  | 'assign'
  | 'bump'
  | 'no show'
  | 'cancel'
  | 'advisor status'
  | 'keyloop sync'
  | 'keyloop load'
  | 'allocate'
  | 'settings'
  | 'simulator';
export interface AuditEntry {
  id: string;
  at: EpochMs;
  branchId: BranchId | null; // null for global settings
  who: Who;
  what: AuditWhat;
  detail: string; // e.g. "W-016 → Daniel Costa (Desk 3): Walk-in that fits before your next appointment"
}

// ---------- Keyloop (mock) ----------
export interface KeyloopDayStatus {
  date: DateKey;
  loadedAt: EpochMs;
  count: number;
  namedByKeyloop: number;
  allocated: number;
  open: number; // no advisor yet
}
export interface KeyloopSync {
  id: string;
  at: EpochMs;
  branchId: BranchId;
  source: 'mock';
  kind: 'nightly' | 'intraday' | 'manual_tomorrow' | 'manual_today';
  date: DateKey;
  added: number;
  updated: number;
  removed: number;
  note: string; // "63 bookings for 2026-10-19"
}
export interface KeyloopState {
  source: 'mock';
  nightlyLoadAt: HHMM; // '22:00'
  intradayEveryMin: 10;
  lastIntradayAt: EpochMs | null;
  days: Record<BranchId, Record<DateKey, KeyloopDayStatus>>;
  history: KeyloopSync[]; // newest first, cap 200
}

// ---------- learning ----------
export interface ServiceAgg {
  visits: number;
  totalMin: number;
  byBrand: Record<BrandCode, { visits: number; totalMin: number }>;
}
export interface WalkInOutcome {
  forecastMin: number;
  quotedMin: number;
  waitMin: number;
} // wait = arrival -> first call
export interface DailyAgg {
  date: DateKey;
  perService: Record<ServiceCode, ServiceAgg>;
  perAdvisor: Record<AdvisorId, Record<ServiceCode, { visits: number; totalMin: number }>>;
  walkIns: WalkInOutcome[];
}
export interface LearningHistory {
  branchId: BranchId;
  days: DailyAgg[];
} // synthesized: 28 days before today

export interface LearningSnapshot {
  branchId: BranchId;
  computedAt: EpochMs; // refreshed every 10 sim minutes
  windowDays: number; // rules.learnDays at compute time; 0 = off
  services: Record<
    ServiceCode,
    {
      configuredMin: number;
      measuredMin: number | null;
      visits: number;
      nowUsingMin: number; // shrunk estimate (section 3.6)
      byBrand: Record<BrandCode, { measuredMin: number; visits: number }>;
    }
  >;
  advisors: Record<AdvisorId, Record<ServiceCode, { visits: number; theirMin: number; teamMin: number; factor: number }>>;
  quote: {
    sampleSize: number;
    marginPct: number; // e.g. 32
    keptPct: number | null; // share called by the time told
    driftTypicalMin: number; // median(wait - forecast)
    driftP80Min: number; // 80th pct of |wait - forecast|
    histogram: [number, number, number, number, number, number]; // 10+ sooner, 5–10 sooner, 0–5 sooner, 1–5 later, 5–10 later, 10+ later
    brokenAvgOverMin: number | null; // "broken ones ran 8 min over"
  };
}

// ---------- simulator ----------
export type Driver = 'sim' | 'person';
export interface VisitSimPlan {
  // per booked appointment
  arrivalOffsetMin: number | null; // relative to slot; null = never arrives
  receptionPick: AdvisorId | 'first_free' | null; // for open bookings: who the simulated receptionist picks
}
export interface ServicePlan {
  // per visit, applied once called (keyed by VisitId or WalkInPlan.id)
  deskMin: number; // actual desk time
  walkSec: number; // call -> customer reaches desk
  missesCall: boolean; // needs "Call again", then "Not here" once
  transferAtFrac: number | null; // e.g. 0.4 -> transfer to "Next free advisor" at 40% of deskMin
}
export interface WalkInPlan {
  id: string;
  branchId: BranchId;
  at: EpochMs;
  serviceCode: ServiceCode;
  brand: BrandCode;
  customer: Customer;
  note: string;
  issuedVisitId: VisitId | null; // set when the simulator issued it
}
export interface BreakPlan {
  id: string;
  advisorId: AdvisorId;
  at: EpochMs;
  reason: BreakReason;
  durationMin: number;
  startedAt: EpochMs | null;
  endedAt: EpochMs | null;
}
export interface RosterPlan {
  advisorId: AdvisorId;
  presentFrom: EpochMs | null;
  presentUntil: EpochMs | null;
} // null from = offline all day
export interface SameDayBookingPlan {
  id: string;
  branchId: BranchId;
  bookedAt: EpochMs;
  kind: 'add' | 'move' | 'cancel';
  payload: unknown;
}

export interface SimScript {
  seed: number;
  appointments: Record<VisitId, VisitSimPlan>;
  service: Record<string, ServicePlan>;
  walkIns: WalkInPlan[];
  breaks: BreakPlan[];
  roster: RosterPlan[];
  sameDay: SameDayBookingPlan[];
}

export interface SimulatorSettings {
  enabled: boolean;
  seed: number; // default 20261019
  drivers: Record<AdvisorId, Driver>; // "Who drives each advisor"
  demoStart: HHMM; // '11:00'
  stepSec: number; // live 1, replay/catch-up 5
}

export interface SimClock {
  anchorSimMs: EpochMs;
  anchorRealMs: number;
  speed: number;
} // speed 1 (dev: ?speed=10)

// ---------- whole state ----------
export interface AppState {
  schemaVersion: 1;
  rev: number; // +1 per commit
  writerId: string; // tab id of last writer (tie-break)
  today: DateKey; // '2026-10-19'
  clock: SimClock;
  branches: Record<BranchId, Branch>;
  branchOrder: BranchId[];
  advisors: Record<AdvisorId, Advisor>;
  services: Record<ServiceCode, ServiceType>;
  serviceOrder: ServiceCode[];
  brands: Brand[];
  users: Record<Username, User>;
  visits: Record<VisitId, Visit>;
  counters: Record<string, number>; // `${branchId}:${date}:${letter}` -> last ticket number; 'seq' for ids
  audit: AuditEntry[]; // newest first, cap 2000
  keyloop: KeyloopState;
  history: Record<BranchId, LearningHistory>;
  learning: Record<BranchId, LearningSnapshot>;
  simulator: SimulatorSettings;
  script: SimScript;
  lastProcessedAt: EpochMs; // leader catch-up cursor
}
