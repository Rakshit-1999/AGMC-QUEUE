// Settings ops (manager only). Every success writes an audit 'settings' entry.
import { DEFAULT_RULES } from '@/domain/constants';
import { ERR } from '@/domain/messages';
import { computeLearning } from '@/domain/queue/learning';
import { currentVisitOf } from '@/domain/queue/view';
import {
  branchCodeTaken,
  isUsernameTaken,
  parseBrands,
  sanitizeRules,
  validateCode,
  validateHours,
  validatePassword,
  validateUsername,
} from '@/domain/validation';
import type {
  ActionResult,
  AdvisorId,
  AppointmentAdvisorMode,
  AppState,
  BranchId,
  BrandCode,
  DeskType,
  EpochMs,
  HHMM,
  QueueRules,
  Role,
  ServiceCode,
  User,
  Username,
} from '@/domain/types';
import { fail, ok, okData, type OpCtx } from './audit';

export interface BranchInput {
  code: string;
  name: string;
  opensAt: HHMM;
  closesAt: HHMM;
  active: boolean;
  appointmentAdvisorMode: AppointmentAdvisorMode;
  rules: QueueRules;
  receptionPassword?: string; // new only -> creates reception.<code lowercased>
}
export interface AdvisorInput {
  name: string;
  branchId: BranchId;
  desk: string;
  deskType: DeskType;
  brands: BrandCode[];
  services: ServiceCode[];
  active: boolean;
  loginUsername?: string;
  loginPassword?: string;
}
export interface ServiceTypeInput {
  code: string;
  name: string;
  expectedMin: number;
  ticketLetter: string | null;
  expressLane: boolean;
  active: boolean;
}
export interface UserInput {
  username: string;
  name: string;
  role: Role;
  branchId: BranchId | null;
  advisorId: AdvisorId | null;
  password?: string /* blank = keep */;
  canSignIn: boolean;
}

/** Recomputes one branch's learning snapshot from history + today's visits. */
export function refreshLearning(s: AppState, branchId: BranchId, now: EpochMs): void {
  const b = s.branches[branchId];
  if (!b) return;
  const history = s.history[branchId] ?? { branchId, days: [] };
  const today = Object.values(s.visits).filter((v) => v.branchId === branchId && v.date === s.today);
  s.learning[branchId] = computeLearning(history, today, b, s.services, now);
}

function uniqueId(base: string, taken: (id: string) => boolean): string {
  if (!taken(base)) return base;
  for (let i = 2; ; i++) if (!taken(`${base}_${i}`)) return `${base}_${i}`;
}

export function opSaveBranch(s: AppState, ctx: OpCtx, input: BranchInput, id?: BranchId): ActionResult<{ id: BranchId }> {
  const code = input.code.trim().toUpperCase();
  const existing = id ? s.branches[id] : undefined;
  if (id && !existing) return fail(ERR.notYourBranch);
  const codeErr = validateCode(code);
  if (codeErr) return fail(codeErr);
  if (branchCodeTaken(s, code, id)) return fail(ERR.branchCodeExists);
  const hoursErr = validateHours(input.opensAt.trim(), input.closesAt.trim());
  if (hoursErr) return fail(hoursErr);
  const rules = sanitizeRules(input.rules);
  const pwd = input.receptionPassword ?? '';
  const receptionUser = `reception.${code.toLowerCase()}`;
  if (!existing && pwd) {
    if (pwd.length < 8) return fail(ERR.receptionPassword);
    if (isUsernameTaken(s, receptionUser)) return fail(ERR.usernameTaken);
  }
  const name = input.name.trim() || code;
  if (existing) {
    const learnChanged = existing.rules.learnDays !== rules.learnDays || existing.rules.promiseTargetPct !== rules.promiseTargetPct;
    existing.code = code;
    existing.name = name;
    existing.opensAt = input.opensAt.trim();
    existing.closesAt = input.closesAt.trim();
    existing.active = input.active;
    existing.appointmentAdvisorMode = input.appointmentAdvisorMode;
    existing.rules = rules;
    if (learnChanged) refreshLearning(s, existing.id, ctx.now);
    ctx.audit({ branchId: existing.id, what: 'settings', detail: `Branch ${code} saved` });
    return okData({ id: existing.id });
  }
  const newBranchId = uniqueId(code.toLowerCase(), (x) => x in s.branches);
  s.branches[newBranchId] = {
    id: newBranchId,
    code,
    name,
    opensAt: input.opensAt.trim(),
    closesAt: input.closesAt.trim(),
    active: input.active,
    appointmentAdvisorMode: input.appointmentAdvisorMode,
    rules: { ...DEFAULT_RULES, ...rules },
    createdAt: ctx.now,
  };
  s.branchOrder.push(newBranchId);
  s.history[newBranchId] = { branchId: newBranchId, days: [] };
  s.keyloop.days[newBranchId] = {};
  refreshLearning(s, newBranchId, ctx.now);
  if (pwd) {
    s.users[receptionUser] = {
      username: receptionUser,
      name: 'Reception',
      role: 'reception',
      branchId: newBranchId,
      advisorId: null,
      password: pwd,
      canSignIn: true,
      createdAt: ctx.now,
    };
  }
  ctx.audit({ branchId: newBranchId, what: 'settings', detail: `Branch ${code} added${pwd ? ` · login ${receptionUser}` : ''}` });
  return okData({ id: newBranchId });
}

export function opSaveAdvisor(s: AppState, ctx: OpCtx, input: AdvisorInput, id?: AdvisorId): ActionResult<{ id: AdvisorId }> {
  const branch = s.branches[input.branchId];
  if (!branch) return fail(ERR.advisorNotInBranch);
  const existing = id ? s.advisors[id] : undefined;
  if (id && !existing) return fail(ERR.advisorNotInBranch);
  if (existing && (existing.branchId !== input.branchId || (existing.active && !input.active)) && currentVisitOf(s, existing.id)) {
    return fail(ERR.advisorServing);
  }
  const login = (input.loginUsername ?? '').trim().toLowerCase();
  const wantsLogin = login.length > 0 && !(existing?.username);
  if (wantsLogin) {
    const uErr = validateUsername(login);
    if (uErr) return fail(uErr);
    if (isUsernameTaken(s, login)) return fail(ERR.usernameTaken);
    const pErr = validatePassword(input.loginPassword ?? '');
    if (pErr) return fail(pErr);
  }
  const name = input.name.trim() || 'Advisor';
  const brands = input.brands.filter((b) => s.brands.includes(b));
  const services = input.services.filter((c) => !!s.services[c]);
  const desk = input.desk.trim() || 'Desk';
  let advisorId: AdvisorId;
  if (existing) {
    advisorId = existing.id;
    existing.name = name;
    existing.branchId = input.branchId;
    existing.desk = desk;
    existing.deskType = input.deskType;
    existing.brands = brands;
    existing.services = services;
    if (existing.active && !input.active) {
      existing.presence = 'offline';
      existing.breakReason = null;
      existing.presenceSince = ctx.now;
    }
    existing.active = input.active;
    if (existing.username) {
      const u = s.users[existing.username];
      if (u) {
        u.branchId = input.branchId;
        u.name = name;
      }
    }
  } else {
    const first = (name.split(/\s+/)[0] ?? 'advisor').toLowerCase().replace(/[^a-z0-9]/g, '') || 'advisor';
    advisorId = uniqueId(`adv_${first}_${branch.code.toLowerCase()}`, (x) => x in s.advisors);
    s.advisors[advisorId] = {
      id: advisorId,
      branchId: input.branchId,
      name,
      desk,
      deskType: input.deskType,
      brands,
      services,
      active: input.active,
      presence: 'offline',
      breakReason: null,
      presenceSince: ctx.now,
      username: null,
    };
    s.simulator.drivers[advisorId] = 'sim';
  }
  if (wantsLogin) {
    s.users[login] = {
      username: login,
      name,
      role: 'advisor',
      branchId: input.branchId,
      advisorId,
      password: input.loginPassword ?? '',
      canSignIn: true,
      createdAt: ctx.now,
    };
    const a = s.advisors[advisorId];
    if (a) a.username = login;
  }
  ctx.audit({ branchId: input.branchId, what: 'settings', detail: `Advisor ${name} ${existing ? 'saved' : 'added'}` });
  return okData({ id: advisorId });
}

export function opSaveServiceType(s: AppState, ctx: OpCtx, input: ServiceTypeInput, code?: ServiceCode): ActionResult {
  const existing = code ? s.services[code] : undefined;
  if (code && !existing) return fail(ERR.unknownService);
  const newCode = existing ? existing.code : input.code.trim().toUpperCase();
  const codeErr = validateCode(newCode);
  if (codeErr) return fail(codeErr);
  if (!existing && Object.keys(s.services).some((c) => c.toUpperCase() === newCode)) return fail(ERR.serviceCodeExists);
  const letterRaw = (input.ticketLetter ?? '').trim().toUpperCase();
  const ticketLetter = letterRaw ? letterRaw.slice(0, 1) : null;
  const expectedMin = Math.max(1, Math.round(Number.isFinite(input.expectedMin) ? input.expectedMin : 1));
  const name = input.name.trim() || newCode;
  const minutesChanged = existing ? existing.expectedMin !== expectedMin : true;
  s.services[newCode] = { code: newCode, name, expectedMin, ticketLetter, expressLane: input.expressLane, active: input.active };
  if (!existing) s.serviceOrder.push(newCode);
  if (minutesChanged) for (const b of s.branchOrder) refreshLearning(s, b, ctx.now);
  ctx.audit({ branchId: null, what: 'settings', detail: `Service type ${newCode} ${existing ? 'saved' : 'added'}` });
  return ok();
}

export function opSaveBrands(s: AppState, ctx: OpCtx, text: string): ActionResult {
  const brands = parseBrands(text);
  if (brands.length === 0) return fail(ERR.keepOneBrand);
  s.brands = brands;
  ctx.audit({ branchId: null, what: 'settings', detail: `Brands: ${brands.join(', ')}` });
  return ok();
}

export function opSaveUser(
  s: AppState,
  ctx: OpCtx,
  input: UserInput,
  username: Username | undefined,
  actingUsername: Username,
): ActionResult {
  const existing = username ? s.users[username] : undefined;
  if (username && !existing) return fail(ERR.username);
  const uname = existing ? existing.username : input.username.trim().toLowerCase();
  if (!existing) {
    const uErr = validateUsername(uname);
    if (uErr) return fail(uErr);
    if (isUsernameTaken(s, uname)) return fail(ERR.usernameTaken);
  }
  const branchId = input.role === 'manager' ? null : input.branchId;
  if (input.role !== 'manager' && (!branchId || !s.branches[branchId])) return fail(ERR.branchRequired);
  let advisorId: AdvisorId | null = null;
  if (input.role === 'advisor') {
    const a = input.advisorId ? s.advisors[input.advisorId] : undefined;
    if (!a || a.branchId !== branchId) return fail(ERR.pickAdvisor);
    advisorId = a.id;
  }
  const pwd = input.password ?? '';
  if (!existing || pwd) {
    const pErr = validatePassword(pwd);
    if (pErr) return fail(pErr);
  }
  if (existing && existing.username === actingUsername && (input.role !== 'manager' || !input.canSignIn)) {
    return fail(ERR.ownManagerAccess);
  }
  // Re-link advisor logins.
  if (existing?.advisorId && existing.advisorId !== advisorId) {
    const old = s.advisors[existing.advisorId];
    if (old && old.username === uname) old.username = null;
  }
  if (advisorId) {
    const a = s.advisors[advisorId];
    if (a) {
      if (a.username && a.username !== uname) {
        const other = s.users[a.username];
        if (other) other.advisorId = null;
      }
      a.username = uname;
    }
  }
  const user: User = {
    username: uname,
    name: input.name.trim() || uname,
    role: input.role,
    branchId,
    advisorId,
    password: pwd || existing?.password || '',
    canSignIn: input.canSignIn,
    createdAt: existing?.createdAt ?? ctx.now,
  };
  s.users[uname] = user;
  ctx.audit({ branchId, what: 'settings', detail: `User ${uname} ${existing ? 'saved' : 'added'}` });
  return ok();
}
