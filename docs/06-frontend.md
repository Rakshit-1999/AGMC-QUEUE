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
