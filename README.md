# AGMC Queue

Aftersales queue for AGMC branches. Appointments from Keyloop keep their slot, walk-ins fill the gaps, and every walk-in gets an honest wait quote ("About 15 min · called by 12:56") that the system learns to keep.

## Status

**Front-end prototype.** There is no backend. All data is mock data, and a live simulator runs the branch: customers arrive, advisors call and serve them. State lives in the browser (localStorage) and syncs across tabs.

Parts marked with an amber **PLACEHOLDER** or **MOCK DATA** tag are waiting on management decisions:

- Microsoft sign-in (SSO). Username and password for now.
- Send SMS on the issued ticket (the button is disabled).
- TV chime when a number is called.
- Arabic text on the TV.
- Real Keyloop connector. Bookings come from a mock source.

## Pages

| Page | Route | Who sees it |
|---|---|---|
| Sign in | `/login` | Everyone |
| Reception | `/reception?branch=<id>` | Reception (own branch); manager (any branch) |
| Service advisor desk | `/advisor` | Service advisor (own desk) |
| Manager overview | `/manager` | Manager |
| Branch dashboard | `/manager/branch/<id>` | Manager |
| Settings | `/manager/settings/<tab>` | Manager. Tabs: `branches` `advisors` `services` `users` `keyloop` `audit` `demo` |
| Waiting-area TV | `/display/<CODE>` (e.g. `/display/SZR`) | No sign-in |

After sign-in each role lands on its own home page and cannot open the other roles' pages. `/manager/settings` redirects to the `branches` tab.

## Quick start

Requires Node.js 20.19+ or 22.12+ (Vite 8). Tested on Node 24.18.0.

```bash
npm install
npm run dev          # http://localhost:5173, then open /login
```

| Command | What it does | Verified |
|---|---|---|
| `npm run dev` | Vite dev server on port 5173. Dev-only UI kit gallery at `/__kit` | Not run here (unverified) |
| `npm run build` | `tsc --noEmit` then `vite build` into `dist/` | Yes |
| `npm run preview` | Serves `dist/` | Not run here (unverified) |
| `npm run typecheck` | `tsc --noEmit` (strict) | Yes |
| `npx vitest run` | Unit tests (`src/**/*.test.ts`), same as `npm test` | Yes (36 tests pass) |

The build is a static site. Any static host can serve `dist/`, but client routes such as `/reception` need a fallback to `index.html`.

## Demo accounts

Password for every account: **`agmc-demo`**. The Sign in page also lists them; clicking a row signs you in.

| Username | Name | Role | Branch |
|---|---|---|---|
| `manager` | Aftersales Manager | Manager | All |
| `reception.szr` | Reception | Reception | Main Branch (SZR) |
| `reception.mc` | Reception | Reception | Motor City |
| `omar.szr` | Omar Haddad | Service advisor | SZR · Desk 1 |
| `layla.szr` | Layla Mansour | Service advisor | SZR · Desk 2 |
| `daniel.szr` | Daniel Costa | Service advisor | SZR · Desk 3 |
| `sara.szr` | Sara Ibrahim | Service advisor | SZR · Desk 4 |
| `ravi.szr` | Ravi Menon | Service advisor | SZR · Desk 5 |
| `priya.szr` | Priya Nair | Service advisor | SZR · Desk 6 (walk-in desk) |
| `marco.szr` | Marco Rossi | Service advisor | SZR · Desk 7 (MINI) |
| `noura.szr` | Noura Saleh | Service advisor | SZR · Desk 8 (express desk) |
| `hassan.mc` | Hassan Ali | Service advisor | MC · Desk 1 |
| `mariam.mc` | Mariam Qasim | Service advisor | MC · Desk 2 |
| `vikram.mc` | Vikram Shah | Service advisor | MC · Desk 3 |
| `elena.mc` | Elena Petrova | Service advisor | MC · Desk 4 (walk-in desk) |
| `yusuf.mc` | Yusuf Karim | Service advisor | MC · Desk 5 (express desk) |

Ahmed Farouk (SZR · Desk 9, appointments only) has no login and is offline all day.

## How the demo works

- **Start time.** The demo clock starts at **11:00 Dubai time on Monday 19 Oct 2026**. On first load the morning (07:30 to 11:00) is replayed, so tickets, KPIs, the audit log and learning are already filled in. The page shows "Loading…" while this runs.
- **Simulator.** While it is on, appointment customers arrive (some early, some late, a few never), walk-ins come in, and advisors that nobody is signed in as call, serve and finish customers. Signing in as an advisor takes that advisor over from the simulator.
- **Reset.** Settings › Demo › **Reset today's demo data** wipes today's tickets and replays the day back to 11:00. The same tab has the simulator **On / Off** switch and **Who drives each advisor**.
- **Cross-tab live updates.** Sessions are per tab, so you can run manager, reception, advisor and TV in separate tabs at once. Open the TV (`/display/SZR`, or "Open waiting-area screen ↗" on Reception) in a second tab and act in the first: the TV updates within about a second.
- **Speed.** Add `?speed=N` to any URL (0 < N ≤ 600) to run the clock N times faster, e.g. `/reception?branch=szr&speed=10`. The speed is shared by all tabs and stays until another `?speed` or a reset.
- **Seed data.** Two branches: Main Branch (SZR, 63 bookings, about 50 walk-ins a day) and Motor City (MC, 30 bookings, about 22 walk-ins). Service types Service 25′, Standard 15′, Collection 8′ (express, ticket letter C). Brands BMW, MINI, BMWi. All data is invented.

To start from scratch, clear the site's localStorage (`agmc-queue:v1`) or use Reset.

## Project structure

```
src/
  app/            Router, route guards, app shell, top bar, Lenis smooth scroll
  components/ui/  Shared UI kit (buttons, chips, dialogs, tables, KPI tiles, toasts)
  domain/         Pure logic: types, queue engine, wait quotes, learning, time, copy
  sim/            Seed data, mock Keyloop, day script, simulator, morning replay
  store/          zustand store, actions (ops), selectors, clock, cross-tab sync
  pages/          login, reception, advisor, manager/overview, manager/dashboard, settings, display
  styles/         Design tokens, base and print CSS
docs/             Spec, architecture, design and guides
```

## Tech stack

Vite 8 · React 18 · TypeScript 7 (strict) · react-router-dom 6 · zustand 5 · Lenis (smooth scroll) · motion (scroll reveal) · Vitest 5. Charts are hand-written SVG. Cross-tab sync uses BroadcastChannel, localStorage and a Web Locks leader tab. Font: Pathway Extreme (Google Fonts). Light mode only.

## Documentation

| File | Contents |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Pages and exact copy. Source of truth |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Domain model, queue engine, store API, simulator, routing |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system, layouts, motion, accessibility |
| [docs/06-frontend.md](docs/06-frontend.md) | Front-end guide: run, rules for page engineers, deviations from spec |
| [docs/07-store-surface.md](docs/07-store-surface.md) | Store hooks, selectors and actions available to pages |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | Task guide per role |
| docs/PERFORMANCE.md, docs/SECURITY.md | Performance and security reviews (if present) |

## Open management questions

The numbers match the banners in Settings and SPEC.md.

| # | Question | Where it shows |
|---|---|---|
| 3 | Keyloop connector: API or a scheduled export file? Only the connector changes. | Settings › Keyloop bookings; "Today's bookings from Keyloop" (MOCK DATA) |
| 5 | Service types and brands: what each type means, how long it takes, and which brands use this queue. | Settings › Service types & brands |
| 6 | Queue rules: maximum walk-in wait, grace for late customers, and the other rule values. | Settings › Branches & queue rules |
| 7 | Add a branch-manager role (one branch only)? | Settings › Users & roles |
| 8 | Replace username/password with AGMC Microsoft sign-in (SSO). | Sign in; Settings › Users & roles |
| — | Does Keyloop name an advisor on a booking? | Branch dialog › Advisor for appointments |

Placeholders not built: SMS, TV chime, Arabic on the TV.

### Design decisions pending

- **TV connection dot.** DESIGN.md asks for an amber dot by the TV clock when sync goes quiet for over 10 s. It is not built.
- **Empty "At the desks" on the TV.** When nobody is being served, the section is hidden. Confirm, or pick wording to show instead.
- **Low-sample quote wording.** With fewer than 5 learned walk-ins the quote uses a fixed 20% margin, but the line under the quote still reads "learned from N walk-ins over the last 28 days". Wording to be agreed.
