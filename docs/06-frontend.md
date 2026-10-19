# AGMC Queue: front-end foundation (FA)

What Foundation A built, how to run it, and where it differs from DESIGN.md / ARCHITECTURE.md.

## Run

```
npm install
npm run dev        # http://localhost:5173 (dev-only UI gallery at /__kit)
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm run build      # typecheck + vite build
npm run test       # vitest (src/**/*.test.ts)
```

Stack: Vite 8, React 18, TypeScript 7 (strict), react-router-dom 6, zustand 5, lenis, motion. Path alias `@/` -> `src/`.

## What is here

- `src/app/`: `App.tsx` (ToastProvider + RouterProvider), `routes.tsx` (every route from ARCHITECTURE §6.1, pages lazy-loaded), `guards.tsx`, `AppShell.tsx`, `SmoothScroll.tsx` (ReactLenis root, lerp 0.1 / 1 under reduced motion), `TopBar.tsx`, `BranchPicker.tsx`, `boot.ts` (calls `startRuntime()` from `@/store`), `dev/KitPage.tsx`.
- `src/components/ui/`: the whole shared kit, exported from `index.ts`.
- `src/styles/`: `tokens.css` (designer's, unchanged), `base.css`, `print.css`.
- `src/pages/login/`: Page 1, complete.
- `src/pages/{reception,advisor,manager/overview,manager/dashboard,settings,display}/`: an `index.ts` plus a STUB page component each. Page owners replace the stub and keep the named export.

## Rules for page engineers

- Import from `@/components/ui`, `@/store`, `@/domain/types`, `@/domain/time` and `@/domain/messages` only.
- Page entry: `index.ts` must keep exporting the named component (`ReceptionPage`, `AdvisorDeskPage`, `OverviewPage`, `BranchDashboardPage`, `SettingsPage`, `DisplayPage`).
- Reception: the guard makes sure `?branch=<id>` is always in the URL, for reception users too. Read it with `useSearchParams().get('branch')`.
- Settings: the guard only lets the known tabs through (`branches advisors services users keyloop audit demo`).
- Inner scroll areas need `data-lenis-prevent`. It is already built into Dialog, RowMenu, Select, Textarea, Tooltip and Table.
- Toasts: `const toast = useToast(); toast.fromResult(result, OK.advisorChanged)`.
- Generic `Select`, `Segmented` and `PillChoice` infer `V` from `value` only. For unions, pass the type: `<Select<AdvisorId | null> …/>`.

## Differences from the specs, and why

| Item | Spec | Built | Why |
|---|---|---|---|
| Wide dialog | ARCH 720 px | 640 px | DESIGN §1.7 and `--dialog-w-wide` say 640; DESIGN owns sizes. |
| Toasts | ARCH: one at a time | Up to 3 stacked, newest at the bottom; an identical repeat restarts its timer | DESIGN §1.8. |
| Phone breakpoint on Sign in | ARCH 720 | 768 | DESIGN §2.1. |
| Sign-in group headings, usernames and demo title | DESIGN ink-3 | ink-2 | ink-3 on `--ground` fails contrast (DESIGN §4.1). |
| Demo title | caps | "DEMO ACCOUNTS · PASSWORD" in caps, `agmc-demo` kept lowercase in mono | It is a password, so the case matters. |
| Sign-in desktop | list scrolls inside the viewport | Brand panel is sticky and the form column scrolls with the page (Lenis) | No nested scroller is needed. |
| Logo | SVG asset | White "AGMC" text wordmark (`<Logo/>`) | The official file has not been supplied yet. |
| No session | ARCH: "Please sign in again." toast whenever there is no session | Toast only when `useSessionStatus()` is `invalid` (user removed or blocked); no session at all, or a normal Sign out, redirects to /login without a toast | Otherwise every Sign out and first visit would show an error. |
| Advisor not linked | DESIGN: full-page message | toast + sign out + /login | ARCH §6.1 routing. `FullPageMessage` exists for pages that need it. |
| Added UI | — | `SectionLabel`, `CellStack`, `FieldGrid`, `AdvisorBar`, `FullPageMessage`, `Button` variant `link` + `pending` + `icon`, `TextInput` `search`/`locked`/`width`, `Select` `variant="onGreen"`/`size`, `Chip` `pulse`, `Dialog` `onSubmit` | DESIGN describes these states and they need an owner. |

## Page notes

Per-page behaviour that differs from, or adds to, SPEC / DESIGN.

- **Reception.** Both Check in tabs (Appointment, Walk-in) stay mounted, so switching tabs keeps search text and walk-in choices. "change advisor" on an appointment row reuses the pick-advisor dialog, so confirming it also checks the customer in. Recently finished has no count in its title.
- **Advisor.** The calling line uses the singular for one call ("called 1 time"). Transfer **Reason** is optional.
- **Manager.** The dashboard uses its own `KpiGrid` (`pages/manager/shared/`), which drops from 7 to 4 columns below 1200 px. Overview branch cards sit 2 per row from 1100 px, not 1280 px as in ARCHITECTURE §7. Chart tooltips show immediately, with no hover delay. An unknown branch id shows "Unknown branch" with an **Overview** button.
- **Settings.** Validation errors show inline under the field and as a clay toast. Defaults: new branch 07:30–18:00 with `DEFAULT_RULES`; new service type 15 min; new user role Reception. Number bounds: queue rules 0–240 min, learning days 0–365, percent 0–100.
- **TV.** The "At the desks" section is hidden when nobody is being served. NEXT shows "0 waiting" with no tiles when the queue is empty. While loading, and on "Screen not available", the header shows the logo only. The connection-lost amber dot (DESIGN §2.8) is not built.
