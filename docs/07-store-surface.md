# Store & domain import surface (for page engineers)

Everything pages need from the data side. Import from `@/store` unless noted. The UI kit is in `@/components/ui` (see `docs/06-frontend.md`).

## Hooks and core
`useAppState(selector, equalityFn?)`, `useLive`, `useNow`, `useHydrated`, `useSession`, `useSessionStatus` ('none' | 'invalid' | 'ok'), `useIsLeader`, `homeFor`, `simNow`, `getSession`, `getState`, `shallowEqual`.

## Selectors by page
- **Common / chips:** `selectBranch`, `selectBranchByCode`, `selectActiveBranches`, `selectAllBranches`, `selectAdvisorsOfBranch`, `selectProjection`, `selectServiceTypes`, `selectBrands`, `statusChip`, `typeChip`, `appointmentArrivalChip`, `notArrivedChip`, `advisorStateChip`, `advisorSourceLabel`, `deskTypeLabel`, `advisorSubtitle`.
- **Sign in:** `selectDemoAccounts`.
- **Reception:** `selectReceptionKpis`, `selectReceptionHeading`, `selectCheckInList`, `selectPickAdvisorOptions`, `selectWalkInOptions` (also returns `quoteBox(row)`, `aboutLine(row)`, `none`), `selectQueueRows`, `selectChangeAdvisorOptions`, `selectAdvisorCards`, `selectNotArrived`, `selectRecentlyFinished`, `selectIssuedTicket` (returns `IssuedTicketView | null`).
- **Advisor desk:** `selectAdvisorDesk` (returns `AdvisorDeskView | null`), `selectTransferTargets`.
- **Manager overview:** `selectGroupTotals`, `selectBranchCards`.
- **Branch dashboard:** `selectDashboardKpis`, `selectDashboardHeading`, `selectArrivalsByHour`, `selectAvgWaitByHour` (buckets carry `axis` "08" and `label` matching SPEC hover text), `selectDeskTimeByService`, `selectAdvisorsToday`, `selectLearning` (`{ off: true, subtitle }` when learning is off; `PromisesView.sentence` is `{ before, bold, after }`), `selectActivity`.
- **Settings:** `selectBranchesTable`, `selectAdvisorsTable`, `selectServiceTypesTable`, `selectBrandsText`, `selectUsersTable`, `selectKeyloopView`, `selectKeyloopHistoryRows`, `selectAuditLog`, `selectSimulatorView`.
- **TV:** `selectTvView` (no personal data by design).

## Actions (all return `{ ok: true } | { ok: false, error }`; show with `useToast().fromResult(result, OK.x)`)
- Auth: `signIn`, `signOut`
- Reception: `checkInAppointment`, `setBookingAdvisor`, `issueWalkIn`, `changeAdvisor`, `moveToFront`, `markNoShow`, `cancelTicket`
- Advisor: `setAvailable`, `startBreak`, `goOffline`, `callNext`, `callAgain`, `startService`, `notHere`, `advisorNoShow`, `complete`, `transfer`
- Settings: `saveBranch`, `saveAdvisor`, `saveServiceType`, `saveBrands`, `saveUser`
- Keyloop: `setNightlyLoadTime`, `loadTomorrow`, `syncToday`
- Demo: `setSimulatorEnabled`, `resetDemo`, `setAdvisorDriver`

Constants: `DEFAULT_RULES`, `BREAK_REASONS`.

## Other modules
- `@/domain/types` — all domain types.
- `@/domain/time` — formatting helpers (12 min / 12′ / m:ss / h:mm:ss / HH:MM Dubai), `simTimeAt`, `dubaiHour`, `hhmmToMinutes`, `addDays`, `monthDayKey`.
- `@/domain/messages` — `ERR`, `OK` (`OK.calling(ticketNo)` is a function), `REASON_TEXT`, `STATUS_TEXT`, `ADVISOR_STATE_TEXT`, `DESK_TYPE_TEXT`, `ROLE_TEXT`, `ROLE_SCOPE_TEXT`, `ADVISOR_MODE_TEXT`, `LABEL` (fixed copy), `noneHandlesLine(n)`, `customerName()`.

Read the actual signatures in `src/store/index.ts` and the selector files before using them; this list is a map, the code is the truth.
