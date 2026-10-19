# AGMC Queue: Security Review (prototype)

Date: 2026-10-19. Scope: `src/**`, `index.html`, `vite.config.ts`, `package.json` / lockfile, built `dist/`. I only reviewed the code. No source file was changed. Checks run: `npm audit`, `npm audit --omit=dev`, a regex scan for secrets over the source and git history, and a node script that reproduces the record-lookup logic (prototype keys).

**Context.** This is a front-end-only demo. Login is a mock, all data is synthetic, the whole `AppState` sits in `localStorage` and is broadcast to every tab. ARCHITECTURE §10 already says that "guards are UX, not security". The severities below assume the build **can be reached by people other than the presenter** (for example, hosted on a static site or left running on a lounge TV). With real customer data in this architecture, the first two findings would be Critical.

Severity scale: critical / high / med / low / info.

---

## Summary

| ID | Sev | Title | Where to fix |
|---|---|---|---|
| P-1 | high | Session is an unsigned username in sessionStorage. Anyone can become any role. | Prototype: deployment control. Real system: SSO. |
| P-2 | high | The public TV browser holds the full state (all PII and plaintext passwords), runs the whole app and can reach `/login` | Prototype: kiosk setup and a flag. Real system: a separate TV feed. |
| P-3 | med | `?speed=N` changes the shared clock from any route, with no sign-in (including `/display`) | Prototype |
| P-4 | med | Lookups by prototype key: `__proto__` is accepted as a username. `__proto__` / `constructor` ids get through actions and guards. | Prototype |
| P-5 | low | Enum fields are not checked by actions (role, deskType, mode, driver, break reason, walk-in brand) | Prototype |
| P-6 | low | No upper bounds on numbers and no length caps on free text. A full localStorage quota silently stops persistence. | Prototype |
| P-7 | low | Sync accepts any shallowly valid state with a higher `rev` (tampering or rev pinning) | Prototype (partly). Real system: by design. |
| P-8 | low | Reception actions are still allowed on an inactive branch | Prototype |
| P-9 | low | `react-router-dom` 6.30.6 has 2 moderate advisories. Not exploitable here. | Track. Upgrade together with the backend. |
| P-10 | info | Demo password literal is duplicated. The demo account list and the password ship in the production bundle. | Prototype |
| P-11 | info | No CSP or security headers. Google Fonts is a third-party call from the TV. | Prototype (host). Real system. |
| P-12 | info | `displayHref` is not URI-encoded in the reception selector | Prototype |
| P-13 | info | Audit log is client-written, mutable and capped. Failed sign-ins are not logged. It contains customer names. | Real system |
| P-14 | info | No session expiry. A password change does not end existing sessions. | Real system |

**Controls that work as intended (verified):**
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` or `javascript:` anywhere in `src`. All user-entered text (customer names, notes, reasons, branch names, desks) is rendered as React text, so it is escaped.
- Both `target="_blank"` links set `rel="noopener noreferrer"` (`src/components/ui/PageHeading.tsx:50`, `src/pages/manager/overview/BranchCard.tsx:57`). Side benefit: with `noopener`, Chromium does not copy sessionStorage into the new tab, so a TV opened from Reception does **not** inherit the reception session.
- **Store actions enforce authorization themselves**, not only the UI:
  - Settings, Keyloop and Demo actions call `requireManager()` (`src/store/actions/settings.ts:21-47`, `keyloop.ts:8-23`, `demo.ts:10-55`).
  - Reception actions authorize against the **visit's** branch through `forVisit` → `requireReceptionFor(v.branchId)` (`src/store/actions/reception.ts:21-27`). `issueWalkIn` authorizes against `input.branchId` (line 40).
  - Advisor actions take no advisor id from the caller. The id comes from the session (`src/store/actions/advisor.ts:17-22`).
  - Cross-branch targets are rejected in the ops: `advisorInBranch` (`src/store/ops/reception.ts:38-41`) and the transfer target branch check (`src/store/ops/advisor.ts:111-114`).
  - `commit` is not exported from `@/store`, and no page calls it.
- Role guards: a reception user on `/reception?branch=<other>` gets "Not your branch" and is sent to their own branch (`src/app/guards.tsx:97-103`). Reception and advisor users on `/manager*` get "Your role cannot open this" (`guards.tsx:56-63`, `routes.tsx:64-92`). A blocked or deleted user is rejected live on every resolve (`src/store/session.ts:58-65`).
- Sign-in returns the same "Wrong username or password" for an unknown user, a wrong password and a blocked account (`src/store/ops/auth.ts:8`). A manager cannot demote or block themselves (`src/store/ops/settings.ts:284-286`).
- TV: `selectTvView` (`src/store/selectors/tv.ts:31-58`) copies out only `ticketNo`, `desk`, `fresh`, the branch title and counts. Its return type has no field that could carry a name, plate or mobile. `DisplayPage` renders only that view (`src/pages/display/DisplayPage.tsx:30-69`).
- The dev kit route is compiled out of production (`src/app/routes.tsx:25,95`). `dist/` has no source maps.
- No API keys, tokens or private keys in the source or in git history. `.env*` is git-ignored.

---

## Findings

### P-1 (high) Anyone can become any role: the session is a forgeable username
**Evidence.**
- `src/store/session.ts:17-26` reads `{username, signedInAt}` from `sessionStorage['agmc-queue:session']` with no secret.
- `session.ts:58-65` trusts it as long as that user exists and `canSignIn` is true.
- All authz (`src/store/actions/authz.ts:13-44`) resolves from this value.
- Passwords are stored in plaintext in `AppState.users[*].password` (`src/domain/types.ts:90`), which is persisted in `localStorage['agmc-queue:v1']`.

**Exploit.** Anyone with devtools on any page (including the TV) can run `sessionStorage.setItem('agmc-queue:session', '{"username":"manager","signedInAt":0}')` and reload. They are now manager: Settings, user management and Demo reset. Another way: read `JSON.parse(localStorage['agmc-queue:v1']).users` to get every password in clear. That includes any "real-looking" password a manager typed into the Users, Advisors or Branch dialogs.

**Fix now (prototype).** This cannot be made secure without a server. Accept it, but contain it:
1. Do not host the build on a public URL. If it has to be shared, put it behind host-level access control (basic auth or an IP allow-list) and add `<meta name="robots" content="noindex">`.
2. Add a visible line on the Users tab and the Branch/Advisor dialogs: "Prototype: passwords are stored unencrypted in this browser. Do not reuse a real password."
3. Optionally, hash prototype passwords (for example SHA-256 with a per-user salt via `crypto.subtle`) so the Users data does not show them in clear. This is cosmetic only, because the session can still be forged.

**Must be done in the real system.** Microsoft Entra ID (SSO) with OIDC Authorization Code + PKCE. Server-issued session in an `HttpOnly; Secure; SameSite=Lax` cookie (or a short-lived access token held only in memory). Roles and branch come from server-side claims or group mapping, never from client storage. No passwords in the app at all.

### P-2 (high) The public TV browser holds everything and can do everything
**Evidence.**
- `/display/:code` mounts the same bundle and runtime as the staff app: `startSync` → `hydrateStore` → `startLeader` (`src/store/index.ts:19-23`).
- The TV tab therefore keeps the **entire** `AppState` in memory and in `localStorage`:
  - every branch's customer names, mobiles, plates and vehicles (`types.ts:112-163`)
  - reception and visit notes
  - Keyloop bookings
  - the audit log with customer names (`src/store/ops/reception.ts:89,216`, `src/store/ops/advisor.ts:76`)
  - all users with plaintext passwords
- It receives every change over BroadcastChannel (`src/store/sync.ts:105-124`).
- It can win the leader lock and run system and simulator writes.
- From the same browser, `/login` is one URL away. It lists every demo account and the password, and signs in with one click (`src/pages/login/DemoAccounts.tsx:28`, `LoginPage.tsx:34`).

The *rendered* TV page does not leak PII. The *machine* running it does.

**Exploit.** A customer in the lounge, or anyone with brief keyboard or touch access to the TV PC, can:
- press F12, or
- edit the URL to `/login` and click "Aftersales Manager", or
- copy the localStorage export.

They then get every customer's name, mobile and plate, and full manager control.

**Fix now (prototype).**
1. Run the TV in a **dedicated browser profile in kiosk mode** (`msedge --kiosk http://…/display/SZR --edge-kiosk-type=fullscreen`, devtools disabled by policy `DeveloperToolsAvailability=2`). Do not sign anyone in on that profile.
2. Hide the demo account list unless a build flag is set, for example `import.meta.env.VITE_DEMO_ACCOUNTS === 'true'` in `src/pages/login/LoginPage.tsx`. That way a "presentation" build can ship without it.
3. Optionally, have the TV tab skip `startLeader()` when the path starts with `/display/`, so a public screen never writes state.
4. Document in the README: "The TV machine holds the full demo dataset. Use a separate profile and kiosk mode. Never show real data."

**Must be done in the real system.**
- The TV must be a **separate, unauthenticated read-only endpoint** that serves only the projection (for example `GET /api/display/{branchCode}` plus SSE or WebSocket). Its payload is built on the server from the same shape as `TvViewOk`: `ticketNo`, `desk`, `fresh`, `title`, `next[]`, `waitingCount`. It must never carry the visit or customer objects.
- Ideally it is a separate minimal bundle (a separate Vite entry) with no login, no store and no staff routes.
- Authenticate the screen as a device: a per-branch display token, revocable, scoped to `display:read` for that branch. Rate-limit it.
- Add a contract test asserting that the display JSON has no keys besides the allow-list.
- Treat `Advisor.desk` and `Branch.name` as public text, because they appear on the TV. Validate on the server and warn managers not to put personal data in them.

### P-3 (med) `?speed=N` changes shared state without sign-in, from any route
**Evidence.** `src/store/sync.ts:182-196` (`applySpeedParam`) runs on every boot, whatever the route or session. It re-anchors `clock` and **publishes** the change to every tab and to localStorage (`onPublished`). ARCHITECTURE §5.3 says it is "dev only", but it is not gated by `import.meta.env.DEV`.

**Exploit.** Opening `/display/SZR?speed=600` (or `/login?speed=600`) on any machine sharing the profile makes the demo day run 600× faster for every open tab. The whole morning ends in seconds, and auto no-show and Keyloop jobs fire. This is unauthenticated mutation of shared state.

**Fix (prototype).** In `applySpeedParam`, return early unless `import.meta.env.DEV`. Also ignore it when `location.pathname.startsWith('/display/')`. If the presenter needs it in a build, move it to the manager Demo tab as a manager-only action that writes an audit row.

### P-4 (med) Prototype-key lookups on plain-object records
**Evidence (reproduced with a node script that mirrors the code).**
- `USERNAME_RE = /^[a-z0-9._-]{3,64}$/` accepts `__proto__` (`src/domain/validation.ts:6`). `isUsernameTaken` uses `hasOwnProperty`, which returns false for it (`validation.ts:30-32`). As a result, `s.users['__proto__'] = user` (`src/store/ops/settings.ts:312`, also `212` for advisor logins) **replaces the prototype of `users`**:
  - The UI reports success.
  - The user is silently dropped on persist, because JSON skips inherited keys.
  - Until reload, `users['role']`, `users['password']` and similar resolve through the new prototype.
- `opSaveAdvisor(input, '__proto__')` (`settings.ts:152-191`): `existing = s.advisors['__proto__']` is `Object.prototype`, which is truthy. The function then writes `name`, `branchId`, `desk`, `deskType`, `brands`, `services` and `active` **onto `Object.prototype`**, which pollutes every object in that tab.
- `opSaveBranch(…, '__proto__')` (`settings.ts:89`) takes the edit path, then throws at line 105 (an uncaught TypeError).
- `setAdvisorDriver('__proto__', …)` (`src/store/actions/demo.ts:45-55`) also passes its `if (!a)` check.
- Guards: `RequireKnownBranch` accepts `/manager/branch/constructor` (`src/app/guards.tsx:115`). `RequireBranchAccess` accepts `?branch=toString` or `constructor` for a manager (`guards.tsx:106`). The page then renders with a function as the "branch" (crash or blank page).

**Exploit.** All of these need manager rights or a devtools call, so the impact is limited to one tab: corruption and denial of service. It is still a real bug class, and it would become serious once ids come from a network API.

**Fix (prototype).**
1. Add a helper `own<T>(rec: Record<string, T>, key: string): T | undefined` that returns `Object.hasOwn(rec, key) ? rec[key] : undefined`. Use it for every lookup keyed by an id that came from outside: in `ops/settings.ts`, `ops/reception.ts`, `ops/advisor.ts`, `actions/reception.ts` (`forVisit`), `actions/demo.ts`, `store/session.ts:60` and `ops/auth.ts:7`, and in `guards.tsx:106,115`.
2. Tighten usernames: `/^[a-z][a-z0-9._-]{2,63}$/` plus a deny-list (`__proto__`, `constructor`, `prototype`).
3. Optionally, in `readStoredState` / `onIncoming`, rebuild records with `Object.assign(Object.create(null), rec)`, or switch to `Map`.

**Real system.** Validate ids server-side with a schema (for example zod or JSON Schema with `additionalProperties: false`). Use typed DB keys, not object maps.

### P-5 (low) Enum and reference fields are not checked inside actions
**Evidence.** Only TypeScript checks these fields. At runtime, any string is stored:
- `UserInput.role` (`ops/settings.ts:305`). A role such as `"admin"` produces a user that `homeFor` sends to `/advisor`.
- `AdvisorInput.deskType` (176, 199)
- `BranchInput.appointmentAdvisorMode` (111, 125)
- `Driver` in `setAdvisorDriver` (`actions/demo.ts:51`)
- `BreakReason` in `startBreak` (`actions/advisor.ts:28`, `ops/advisor.ts:29`)
- `IssueWalkInInput.brand`, which is not checked against `s.brands` (`ops/reception.ts:106-136`)
- `customer.mobile`, `customer.plate` and `vehicle`, which are trimmed but never checked for format

**Fix (prototype).** Add `isRole`, `isDeskType`, `isAdvisorMode`, `isDriver`, `isBreakReason` guards in `domain/validation.ts`, built from the constant arrays. Reject a walk-in whose `brand` is not in `s.brands`. Optionally add a loose UAE mobile pattern (`^\+?971\s?5\d(\s?\d){7}$` or empty).

### P-6 (low) No upper bounds or length caps
**Evidence.**
- `sanitizeRules` clamps at ≥ 0 only (`src/domain/validation.ts:40-53`). Only `promiseTargetPct` is bounded. A `learnDays` of 1e9 or a `walkInCapMin` of 1e9 is accepted.
- `expectedMin` has a floor but no ceiling (`ops/settings.ts:238`).
- Free text has no cap: customer name, notes (`ops/reception.ts:153`, `ops/advisor.ts:101`), reasons, branch name, desk, service name and brands text.
- When a write exceeds the localStorage quota, it is swallowed (`src/store/sync.ts:70-72`), so persistence silently stops for every tab.

**Fix (prototype).**
- Clamp each rule to a sane maximum (for example 0-240 min, `learnDays` 1-90) and `expectedMin` to 1-480.
- Cap text: names and desk at 80, notes and reasons at 500, brands at 20 × 20 characters.
- Enforce the caps in the ops, and mirror them with `maxLength` in the inputs.
- Show the existing amber sync dot, or a toast, when `setItem` throws.

### P-7 (low) The sync path trusts any shallowly valid state
**Evidence.** `looksValid` checks only `schemaVersion`, `rev`, `today`, `clock` and `visits` (`src/store/sync.ts:39-43`). Incoming state with a higher `rev` replaces everything, including `users` (`sync.ts:117-124`, `88-103`). A message with `rev: Number.MAX_SAFE_INTEGER` pins the state, so later commits cannot win.

**Exploit.** Any same-origin script or a hand-edited localStorage entry can rewrite users, roles and data in every tab. This is not a standalone issue, but it amplifies P-1 and any future XSS.

**Fix (prototype).** Reject `rev` values that jump by more than, say, 10,000 over the local value. Validate the shapes of `users`, `branches` and `advisors` (roles are valid enums, and the P-4 key rules apply).

**Real system.** Clients never push full state. They send commands, the server validates each one, and the server is the only writer.

### P-8 (low) Reception actions are allowed on an inactive branch
**Evidence.** `requireReceptionFor` checks role and branch, but not `branch.active` (`src/store/actions/authz.ts:27-34`). `opIssueWalkIn` checks only that the branch exists (`ops/reception.ts:109-110`).

**Fix.** Return a "Branch is inactive" error for non-managers when `!s.branches[branchId].active`. The TV already refuses inactive branches.

### P-9 (low) Dependency advisories
**Evidence.** `npm audit` and `npm audit --omit=dev` give the same result: 2 moderate, both in `react-router` / `react-router-dom` 6.30.6. The advisory ranges cover up to 7.17.0, and there is no 6.x fix.
- **GHSA-wrjc-x8rr-h8h6** (open redirect via backslash in `<Link>` / `useNavigate`). Not exploitable here: every `to` / `navigate()` target is built from constants, `homeFor()`, or ids that have already been looked up. There is no `?next=` / `returnTo` parameter.
- **GHSA-337j-9hxr-rhxg** (constructor injection in SSR `deserializeErrors`). Not applicable: this is a client-only `createBrowserRouter` with no hydration data.
- No other advisories. The secret scan over the source and git history found nothing.

**Fix.** Keep navigation targets internal. Add a lint or code-review rule that nothing user-supplied is ever passed to `navigate`. Plan the move to `react-router` ≥ 7.18.4 together with the backend work, since it is a breaking upgrade. Run `npm audit --omit=dev` in CI.

### P-10 (info) Demo credentials in the shipped bundle
**Evidence.** `agmc-demo` is defined in `src/domain/constants.ts:64` and again as a separate literal in `src/pages/login/LoginPage.tsx:10`. It appears in `dist/assets/index-*.js` and `login-*.js`. This is expected for the demo, but it is unconditional.

**Fix.** Import `DEMO_PASSWORD` from constants instead of re-declaring it. Gate both the list and the constant behind `VITE_DEMO_ACCOUNTS` (see P-2).

### P-11 (info) No CSP or headers. Third-party fonts.
**Evidence.** `index.html:10-13` loads Google Fonts CSS. There is no Content-Security-Policy or Referrer-Policy, and nothing like `X-Frame-Options`. Every client, including the lounge TV, contacts Google.

**Fix (when hosted).**
- Self-host the two font families under `public/fonts`.
- Serve these headers: `Content-Security-Policy: default-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`, plus `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`.
- Check that Vite's production build needs no `unsafe-inline`.

### P-12 (info) `displayHref` is not encoded
**Evidence.** `src/store/selectors/reception.ts:465` builds `` `/display/${b.code}` ``, while `src/store/selectors/manager.ts:136` uses `encodeURIComponent`. It is safe today because `CODE_RE` is `[A-Za-z0-9]+`.

**Fix.** Use `encodeURIComponent(b.code)` for consistency, in case the code rules are relaxed later.

### P-13 (info) Audit log integrity and content
**Evidence.**
- Audit rows are written by the client into shared state (`src/store/ops/audit.ts:26-29`). The `who` value comes from the client session.
- Rows are capped at 2000 and the oldest are dropped.
- `resetDemo` replaces them (`actions/demo.ts:27-42`).
- Failed sign-ins leave no trace, because `commit` discards a draft that fails (`src/store/actions/auth.ts:8-11`).
- Details include customer names.

**Real system.**
- Audit is written **server-side** in the same transaction as the command. `who` comes from the verified token (UPN / object id). Store the source IP and user agent too.
- Storage is append-only: there is no update or delete permission for the app role (for example a hash-chained table or immutable blob storage).
- Retention is set by policy, not by row count.
- Log failed and blocked sign-ins (Entra sign-in logs cover the SSO part).
- Store customer references (visit id or ticket) in audit details rather than names, or restrict the audit view and set a retention limit for PII under UAE PDPL.
- "Reset demo" must not exist in production.

### P-14 (info) Session lifetime
**Evidence.** `signedInAt` is stored but never checked (`src/store/session.ts`). Changing a user's password does not end their existing tab sessions. Blocking does (good).

**Real system.**
- Idle timeout of about 30 minutes for reception and advisor desks and 15 minutes for managers, plus an absolute lifetime.
- Server-side session revocation on block, role change or password reset (the SSO sign-out / CAE event).
- Session cookies scoped per site.

---

## Answers to the review questions

1. **Role guards and URL access.** Reception and advisor users cannot reach `/manager*`. Reception users cannot open another branch's `/reception?branch=`: the guard redirects with "Not your branch". More importantly, the **store actions enforce the same rules on their own** (see the controls list above), so getting past a UI guard does not let anyone run another branch's or another role's actions. The real gap is identity (P-1), not the authz checks. Read access cannot be restricted in this architecture: every role, and the TV, holds every branch's data.
2. **TV.** `selectTvView` and `DisplayPage` cannot leak PII on screen. The TV *browser*, however, holds the full dataset with plaintext passwords and can sign in as manager (P-2). This is a prototype limitation and must be removed by giving the real system a server-side, allow-listed display feed.
3. **XSS.** No HTML sinks. All user text is rendered as React text. Both new-tab links use `noopener noreferrer`. No unsafe URL construction (P-12 is cosmetic).
4. **Secrets.**
   - The demo password is a source constant, shipped in the bundle (P-10).
   - Every user password, including ones a manager types later, is stored in plaintext in `localStorage['agmc-queue:v1']` (P-1).
   - The session is a plain username in sessionStorage.
   - No API keys or tokens anywhere.
   - If deployed publicly, anyone could become manager and read all data.
5. **Dependencies.** 2 moderate (react-router), not exploitable in this app (P-9).
6. **Input validation.** These are checked: codes, HH:MM, opening hours, password length and username format. Gaps:
   - prototype keys (P-4)
   - unchecked enums and walk-in brand (P-5)
   - no upper bounds or length caps (P-6)
   - shallow validation of synced state (P-7)

   I found no bypass of the `≥ 0` integer clamps or of the `promiseTargetPct` 1-99 range.
7. **Readiness for the real system.** See the checklist below.

## Checklist for the real system

- [ ] **SSO:** Entra ID, OIDC code + PKCE, `HttpOnly` session cookie or in-memory token. Map roles and branch from Entra groups or app roles on the server. A future "branch manager" role is a server claim. Remove all password fields and the demo list.
- [ ] **Server-side authz on every command:** port `authz.ts` as middleware that is applied to each `store/ops/*` command endpoint (ARCHITECTURE §10 seam).
  - Reception: the visit's branch must equal the claim's branch.
  - Advisor: `advisorId` comes from the token, never from the request body.
  - Manager: `settings:*`.
  - Deny by default.
- [ ] **Read scoping:** query endpoints return only the caller's branch (reception) or desk (advisor). Customer mobile and plate go only to the roles that need them. No full-state snapshots to clients.
- [ ] **Server-side validation:** schema-validate every command (enums, lengths, numeric bounds, `Object.hasOwn` / typed keys). Allocate ids on the server.
- [ ] **TV:** a separate read-only endpoint carrying the allow-listed projection only, a per-device revocable token, a separate minimal bundle, kiosk lockdown on the TV PCs, and a contract test that fails if any non-allow-listed key appears.
- [ ] **Audit:** server-written in the same transaction, append-only, real identity, failed sign-ins logged, PII minimized, retention policy.
- [ ] **Keyloop connector:** credentials in a server-side secret store (Key Vault). Never in the front end or the repo. Least-privilege API scope, TLS, inbound data validation, rate limits, and logging that does not dump PII.
- [ ] **Transport and headers:** HTTPS only, HSTS, the CSP from P-11, CSRF protection if cookies are used (`SameSite` plus a token for unsafe methods), WebSocket/SSE authentication.
- [ ] **PII handling:** UAE PDPL review. Retention for visits, notes and audit. Encryption at rest. Mask mobiles in lists (`+971 5x xxx 1234`) where the full number is not needed.
- [ ] **Dependency hygiene:** `npm audit --omit=dev` in CI, upgrade react-router to ≥ 7.18.4, and Renovate or Dependabot.
