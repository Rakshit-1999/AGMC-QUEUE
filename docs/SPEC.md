# AGMC Queue — Front-end Pages & Copy (source of truth)

Transcribed from the product document dated 19 Oct 2026. Every page's layout and **exact text** is given here. When this file and anything else disagree, this file wins.

The queue system has seven pages: three signed-in roles (manager, reception, service advisor) plus a public waiting-area TV. This build is a **front-end prototype with mock data and a live simulator** (no real backend). Anything marked PLACEHOLDER or MOCK DATA stays visible as an amber tag.

---

## Overview

Seven pages serve three signed-in roles and one public screen. Each person lands on their role's home page after signing in and cannot open the other roles' pages. The manager is the exception: they can also open any branch's reception view.

| Page | Who sees it | Address | What it is for |
|---|---|---|---|
| Sign in | Everyone | /login | Username and password (Microsoft sign-in later) |
| Reception | Reception (own branch); manager (any branch) | /reception | Check customers in, issue walk-in tickets, run the live queue |
| Service advisor desk | Service advisor (own desk) | /advisor | Call, serve and finish customers; see own line and day |
| Manager overview | Manager | /manager | Every branch live on one screen |
| Branch dashboard | Manager | /manager/branch/<id> | One branch in depth: charts, learning, activity |
| Settings | Manager | /manager/settings | Branches and queue rules, advisors, services, users, Keyloop, audit log, demo |
| Waiting-area TV | No sign-in | /display/<branch code> | Ticket numbers being called and the desk to go to |

**Screen sizes.** Reception, the advisor desk and the manager pages are desktop screens (designed at 1440–1600 px wide) and must stay usable down to a 1024 px laptop. The TV is a 1920×1080 landscape screen seen from across a room. Sign in must also work on a phone.

**Live updates.** Reception, advisor, manager and TV pages refresh by themselves within about a second of any change, and every timer ticks each second. Nothing needs a manual refresh button. (In this prototype: a shared in-browser store + simulator; use BroadcastChannel/storage events so the TV in another tab updates too.)

---

## Design basics

AGMC house style: one dark AGMC green on a warm light ground, the Pathway Extreme typeface, **light mode only** (no dark theme). Colour always carries a meaning, so the same colour means the same state on every page.

| Role | Colour | Used for |
|---|---|---|
| AGMC green | #153804 | Top bar, primary buttons, selected choices, good states (on time, available, done) |
| Deep green | #0D2402 | Sign-in hero panel only |
| Page ground | #F5F4EF | Behind every card |
| Cards | #FFFFFF, border #ECEAE3 | All panels and tables |
| Ink | #16150F / #4A4840 / #75726A | Main text / secondary text / hints and labels |
| Clay (warning) | #8C3A2B on #F5EAE6 | Something is wrong: past the time we told them, over the cap, late, no-show |
| Amber (watch) | #8A5A00 on #FBF1DD | About to go wrong or needs a look: calling, on break, late appointment, placeholder tags |
| Blue (neutral info) | #1F4E79 on #E7EEF5 | Waiting tickets |
| Chart: appointments | #2F6B1A | Appointment bars; "called sooner than told" bars |
| Chart: walk-ins | #B8862A | Walk-in bars; "called later than told" bars |

The two chart colours were checked for colour-blind readers. Red against green failed, so "later than told" uses the ochre, not red.

**Type.** Pathway Extreme for everything (Google Fonts); a monospaced face for ticket numbers (A-014, W-018, C-004), usernames and Keyloop references. Page titles 24 px bold, section titles 17 px bold, body 14 px, hints 11.5–12.5 px. Ticket numbers are the largest text on a screen where they matter: 44 px on the advisor desk and issued ticket, 64 px on the TV.

**Shapes.** Cards 14 px corners with a soft shadow. Buttons and inputs 10 px corners. Status chips are fully rounded pills. Top-bar navigation uses white-outlined pills; the active page is a solid white pill with green text.

**Numbers.** All times are Dubai time, 24-hour (09:30). Minutes are shown as "12 min" in prose and "12′" in tight spaces. Timers count up live as m:ss (12:03), or h:mm:ss past an hour.

---

## Global elements

Every signed-in page shares one top bar, one dialog style and one message style.

**Top bar** (green, 58 px tall, stays at the top while scrolling), left to right:
1. AGMC logo (white), a thin divider, then the product name **Queue**. Clicking it goes to the role's home page.
2. Navigation pills by role: Manager: **Overview · Settings**; Reception: **Queue**; Service advisor: **My desk**.
3. Manager only, on the reception page: a branch picker (drop-down of branch names).
4. Right side: the live clock (e.g. 11:45), the person's name and role ("Omar Haddad · Service advisor", "Reception · Main Branch (SZR) · Reception", "Aftersales Manager · Manager"), and a **Sign out** pill.

**Page heading.** Page title (e.g. "Main Branch (SZR)"), a grey line under it (e.g. "Reception · open 07:30–18:00"), and an optional link on the right.

**KPI tiles.** A row of tiles, each with a small label, a big number with a small unit ("8 min", "92%"), and an optional hint line. A tile turns clay (pale clay background, clay number) when it needs attention. Empty values show "—".

**Dialogs.** A centred white panel over a dimmed page: title, a short grey explanation, the fields, then the buttons at the bottom right. The safe choice is a quiet **Back** or **Cancel**. The action button is green, or clay-outlined when it is destructive. Escape or clicking outside closes it.

**Row menus.** A "•••" button at the end of a table row opens a small menu of actions. Destructive actions are clay.

**Messages (toasts).** A dark pill at the bottom centre for 2.6 s after a successful action (e.g. "Advisor changed"), or a clay pill for 5 s with the server's reason when something fails (e.g. "Finish your current customer first").

**Loading and empty states.**

| Where | Text |
|---|---|
| Any page while loading | Loading… |
| Reception queue, no one waiting | Nobody waiting |
| Appointment search, no match | No appointment matches |
| Appointments not arrived, none left | None left today |
| Recently finished, nothing yet | Nothing yet |
| Advisor "My day", nothing booked | Nothing booked for you today |
| Branch dashboard, no finished visits | No finished visits yet |
| TV screen not found | Screen not available: <reason> |

**Placeholder tags.** Small amber tags marked **PLACEHOLDER** or **MOCK DATA** flag parts still waiting on management decisions. Keep them visible in the design until those decisions are made.

---

## Page 1 — Sign in

A split screen: a deep-green brand panel on the left, the sign-in form on a warm off-white panel on the right. On a phone the brand panel shrinks to a band at the top.

**Left panel (brand)**
- AGMC logo, white, top left
- Headline: **Every customer, in the right order.**
- Line under it: Aftersales queue for every AGMC branch — appointments from Keyloop keep their slot, walk-ins fill the gaps, and nobody waits without an honest estimate.
- Footer, bottom left: © 2026 AGMC · Prototype

**Right panel (form)**

| Element | Text |
|---|---|
| Title | Sign in |
| Line under title | Microsoft sign-in (SSO) will replace this form. [PLACEHOLDER tag] |
| Field 1 label | Username |
| Field 2 label | Password |
| Button (full width, green) | Sign in |
| Error under the fields | Wrong username or password |

**Demo accounts list** (demo only; hidden in the real system). Title: **DEMO ACCOUNTS · PASSWORD agmc-demo**. One clickable row per account, grouped under small headings ("Manager", "Main Branch (SZR)", "Motor City"). Each row shows the person's name in bold, their username in small mono (omar.szr), and a role chip on the right: **Manager**, **Reception** or **Service advisor**. Clicking a row signs in as that person.

After signing in, each role goes to its home page: manager → Manager overview, reception → Reception, advisor → Service advisor desk.

---

## Page 2 — Reception

Reception's single working screen: check customers in on the left, watch and steer the queue on the right. Layout: page heading, a row of nine KPI tiles, then two columns — a 390 px **Check in** panel that stays in view while scrolling, and a wide column with **Queue**, **Advisors**, then **Appointments not arrived** and **Recently finished** side by side.

**Page heading.** Title = branch name ("Main Branch (SZR)"). Line under it: "Reception · open 07:30–18:00". Link on the right: "Open waiting-area screen ↗" (opens the TV page in a new tab).

### KPI tiles

| Label | Value | Hint line | Turns clay when |
|---|---|---|---|
| Waiting now | 3 | 1 being called | — |
| Longest wait | 8 min | — | at or over the walk-in cap |
| With advisors | 6 | — | — |
| Past the time we told them | 0 | walk-ins still waiting | above 0 |
| Wait promises kept | 83% | 18 walk-ins today | — |
| Walk-ins over cap | 0 | cap 15 min | above 0 |
| Appointments next 30 min | 2 | 0 running late | — |
| Served today | 31 | 3 no-shows | — |
| Appointments on time | 95% | — | — |

### Check in — Appointment tab

Panel title **Check in**, then a two-way switch: **Appointment | Walk-in**.
- Search box, placeholder: "Name, plate, mobile or Keyloop ref"
- Small line under it: "Today's bookings from Keyloop" + MOCK DATA tag
- A scrolling list of today's appointments, most relevant first. Each row: the slot time large on the left (12:00); customer name; "Dubai X 75542 · BMW X6 M60i"; "Service · Layla Mansour (allocated)"; a status chip; on the right a green **Check in** button and a small "change advisor" link. Already checked-in rows are faded and show the ticket number and status instead of buttons.
- How the advisor was chosen, in brackets after the name: "(booked in Keyloop)", "(allocated)", "(picked at reception)", or "no advisor yet".

| Status chip | Colour | When |
|---|---|---|
| in 28 min | grey | more than 10 min before the slot |
| Due now | green | within 10 min of the slot |
| 4 min late | amber | after the slot, within the 15-min grace |
| 18 min late · walk-in | clay | past the grace: they will queue as a walk-in |
| Missed · joins as walk-in | clay | already marked no-show |

**Pick-advisor dialog** (opens on "change advisor", or on Check in when no advisor is set):
- Title: "Check in Aisha Khan"
- Explanation: "12:00 · Service · BMW. Customers booking online do not choose an advisor — pick who serves them."
- Field **Advisor** (drop-down): "Whoever is free first" (only when no advisor is set yet), then "Omar Haddad · Desk 1 · free" / "… · serving" / "… · break"
- Buttons: **Back** · **Check in**

### Check in — Walk-in tab

Top to bottom:
1. **SERVICE** — choice pills: "Service · 25m", "Standard · 15m", "Collection · 8m" (selected = solid green)
2. **BRAND** — choice pills: BMW · MINI · BMWi
3. **ADVISOR** — one row per advisor who can take this customer, soonest first: "**Ravi Menon** · Desk 5 [Soonest chip] about 15 min", "**Omar Haddad** · Desk 1 about 20 min" … and a last row "Whoever is free first about 15 min". The selected row has a green outline and pale green fill; the soonest is selected by default.
4. **Quote box** (pale green; pale clay when the wait is 30 min or more):
   - "Tell the customer"
   - Big: "About 15 min"
   - "**Ravi Menon** will see them · called by **12:56**" (or "The first free advisor will see them · called by 12:56")
   - Small grey: "Forecast 11 min + 32% margin, so about 8 in 10 walk-ins are called sooner than told · learned from 20 walk-ins over the last 28 days"
   - When it applies (clay): "Would finish after closing — offer a drop-off or a booking."
   - When 30 min or more: "Long wait — offer to leave the car (drop-off) or book a slot."
   - When nobody can take it (clay box): big "No advisor can take this now", then "7 advisor(s) present; none handles this brand/service."
5. Fields in two columns: **Customer name** · **Mobile** (placeholder "+971") · **Plate** · **Vehicle** (placeholder "e.g. X5 xDrive40i"); then **Note** (placeholder "Optional")
6. Big green button: **Issue walk-in ticket**

### Ticket issued (replaces the tabs after a check-in or walk-in)
- Small caps label: TICKET ISSUED
- The ticket number, very large: W-018
- Customer name (or "Walk-in customer"), then "Service · BMW"
- "Tell them: **Sara Ibrahim will see you** in **about 20 min** — called by **13:01**" (or "the first free advisor will see you")
- Late appointments only (clay): "Arrived after the grace window — queues as a walk-in."
- Buttons: **Print ticket** · **Send SMS** (disabled, PLACEHOLDER) · then a full-width green **Next customer**

### Queue

Title **Queue**, with "3 waiting · in the order they will be called". One row per waiting customer.

| Column | Shows |
|---|---|
| # | Position: 1, 2, 3 |
| Ticket | W-018 (mono, bold) |
| Customer | Name; plate underneath |
| Type | Chip "Appointment 12:30" (green), "Walk-in" (outlined) or "Late appt 11:00 · walk-in" (amber). Under it when relevant: "Moved up: <reason>" (amber), "Assigned → Omar Haddad" |
| Service | Service name; brand underneath |
| Arrived | 12:39 |
| Waiting | Walk-ins: "7 min" turning amber near the cap and clay at the cap; under it "told by 12:49", or in bold clay "6 min past told time". Appointments: minutes since the slot, or "early · slot 13:00" |
| Advisor | The customer's advisor in bold (or "Whoever is free first"); under it "est. 12:42", or amber "est. 12:41 · Omar Haddad covering", or clay "No advisor available" |
| ••• | Row menu: Change advisor… · Move to front… (walk-ins only) · Mark no-show · Cancel ticket… (clay) |

A row whose walk-in is past the time we told them gets a pale clay background and a clay bar on its left edge. Moved-up and assigned rows get a faint highlight.

**Row dialogs**

| Action | Title | Explanation | Fields | Buttons | Message after |
|---|---|---|---|---|---|
| Change advisor | Change W-018's advisor | Chloe moves to this advisor's line and keeps their place by arrival time. Tell them who will see them. | Advisor (Whoever is free first / name · desk); Reason | Back · Change advisor | Advisor changed |
| Move to front | Move W-018 to the front | Next for the first free advisor who can take it. Every override is logged with your reason. | Reason (required), placeholder "e.g. elderly customer, VIP, came back after drop-off" | Back · Move to front | Moved to the front |
| Mark no-show | W-018 — no-show? | Chloe is not here. The ticket closes as a no-show. | — | Back · Mark no-show (clay) | Marked as no-show |
| Cancel | Cancel W-018 | The ticket closes and leaves the queue. | Reason | Back · Cancel ticket (clay) | Ticket cancelled |

### Advisors
Title **Advisors**, with "8 of 9 present". A grid of cards, busiest first (serving, calling, available, on break, offline). Each card:
- Name in bold; under it "Desk 6 · Walk-in desk" or "Desk 7 · MINI" or "Desk 8 · Express desk"
- State chip on the right: **Serving** (dark green), **Calling** (amber), **Available** (green), **On break** (amber), **Offline** (grey)
- With a customer: "A-021 Fatima Haddad 33′ / 33′" and a progress bar that turns clay when over the expected time
- Without one: "Next appointment 14:00", or "Free", or "Break · Coffee · 12 min", or "Not signed in"
- Cards of advisors on break or offline are shaded

### Appointments not arrived
Title with a count ("39"). One line each: slot time, customer name, "Layla Mansour · Service", and a chip: "in 15′" (grey), "4′ late" (amber) or "missed" (clay).

### Recently finished
One line each: finish time, "A-013 Sara Smith", "Daniel Costa · Standard", and a status chip: **Done** (green), **No-show** (clay) or **Cancelled** (grey).

---

## Page 3 — Service advisor desk

One advisor's own screen: who they are serving now, who is next, and their day. Layout: page heading with the status switch on the right, four KPI tiles, then two columns — a wide left column (the **current customer** card, then **Your line**) and a 380 px right column (**My day**).

**Page heading.** Title = advisor name ("Omar Haddad"). Line under it: "Desk 1 · Main Branch (SZR)".

**Status switch** (three segments; the active one is filled): **Available** (green) · **Break** (amber) · **Offline** (dark grey). While a customer is at the desk the other two are disabled, with the tooltip "Finish or transfer your customer first". Messages: "You're available", "Enjoy your break", "Signed off the queue".

**Break dialog.** Title: "Take a break". Explanation: "Your appointments that come due meanwhile can be covered by a colleague." Reason pills: Coffee · Prayer · Lunch · Workshop · Meeting. Buttons: **Back** · **Start break**.

### KPI tiles

| Label | Value | Hint |
|---|---|---|
| Served today | 7 | — |
| Average desk time | 34.4 min | — |
| Appointments on time | 100% | — |
| Waiting for you | 0 | your appointments + assigned |

### Current customer card — five states

The big card changes with the advisor's situation. Every state shows the ticket number very large, the customer's name large beside it (or "Walk-in customer"), and the type chip ("Appointment 12:30" / "Walk-in").

**State A — Calling** (customer walking to the desk)
- Small caps line, amber, gently pulsing: CALLING TO DESK 1
- "Called 0:42 ago · called 2 times. The waiting-area screen shows A-014 → Desk 2."
- Customer details grid (below)
- Buttons: **Customer is here — start** (big, green) · **Call again** (big) · **Not here — back to queue** · **No-show** (clay)
- Messages: "Started", "Called again", "Back in the queue", "Marked as no-show"

**State B — Serving**
- Small caps line, green: WITH YOU SINCE 12:08
- A very large live timer against the expected time: "13:00 / 25:00 expected". The timer and its progress bar turn clay once over.
- Customer details grid (below)
- Notes the reception or earlier visits left, in a grey box
- Field: "Note for this visit (optional)", placeholder "e.g. job card opened in Keyloop, courtesy car booked"
- Buttons: **Complete** (big, green; message "Done — nice work") · **Transfer…** (big)

**Customer details grid** (label above, value below): MOBILE · PLATE · VEHICLE · SERVICE ("Service · MINI") · ARRIVED · WAITED ("30 min") · KEYLOOP REF (mono, "KL-SZR-1019-030") · EXPECTED TIME ("33 min", learned from history).

**Transfer dialog.** Title: "Transfer A-021". Explanation: "The customer goes back to the queue — to a colleague, or to whoever is free next (kept at the front)." Field **To**: "Next free advisor" or "Name · Desk". Field **Reason**, placeholder "e.g. MINI specialist needed". Buttons: **Back** · **Transfer**. Message: "Transferred".

**State C — Ready, someone is next**
- Small caps line, green: READY
- Small heading: "Next for you"
- Ticket, name and chip of the next customer
- One line on why them: "Your appointment is due · Service · BMW · about 25 min" (the reasons are listed in Shared wording)
- Big green button: **Call A-021** (message "Calling A-021")

**State D — Ready, nobody waiting**
- READY
- Large: "Nobody is waiting for you."
- "Your next appointment is at 14:00 (Khalid Al Hashimi). Walk-ins that fit before it will come to you automatically." (or "No more appointments booked for you today.")

**State E — On break or offline**
- Small caps: "ON BREAK · COFFEE" or "OFFLINE"
- Large: "Enjoy your break." or "You're not taking customers."
- "While you're away, your appointments that come due can be served by a colleague."
- Big green button: **I'm back — available**

### Your line (only when someone is waiting for this advisor)
Title **Your line**, with "2 waiting for you · pull up their vehicles in Keyloop before they reach your desk".

| Column | Shows |
|---|---|
| Ticket | W-018 + type chip |
| Customer | Name; mobile underneath |
| Vehicle | "BMW X5 xDrive40i"; plate · Keyloop ref underneath |
| Service | Service; brand underneath |
| Waiting | 9 min |
| You call them | "about 12:50" (or "Omar Haddad may cover"); "told 12:55" underneath |

### My day
Title **My day** with a count. One line per appointment and walk-in of this advisor today, in time order: time; "A-016 Chloe Karimi" (ticket number in mono once issued); "Appointment · Service" or "Walk-in · Collection · served by Daniel Costa"; a status chip on the right (Booked / Waiting / Called / With advisor / Done / No-show / Cancelled). Footer line: "On-time rate: 100% · counted from the later of slot and arrival".

---

## Page 4 — Manager overview

Every branch on one screen, live: group totals across the top, then one card per branch (two cards per row on a wide screen). New branches appear here automatically.

**Page heading.** Title: "All branches". Line under it: "Monday, 19 Oct 2026 · live". Link on the right: "+ Add a branch" (opens Settings › Branches).

### Group totals (KPI tiles)

| Label | Hint | Turns clay when |
|---|---|---|
| Waiting now | — | — |
| With advisors | — | — |
| Wait promises kept | walk-ins called by the time told | — |
| Past the time we told them | walk-ins waiting now | above 0 |
| Served today | — | — |
| No-shows | — | — |
| Appointments still to come | — | — |

### Branch card
1. Header: branch name ("Main Branch (SZR)"), under it "SZR · 07:30–18:00 · 9 advisors" ("· inactive" if switched off); link on the right "Dashboard →".
2. Eight small figures in a 4 × 2 grid, each a label over a number (a number turns clay when it needs attention):

| Label | Example | Clay when |
|---|---|---|
| Waiting | 4 | a walk-in is over the cap |
| Longest | 9′ | at or over the walk-in cap |
| Served | 39 | — |
| On time | 92% | — |
| Walk-in wait | 13′ | — |
| Promises kept | 83% | someone is waiting past the time told |
| Desk time | 21′ | — |
| No-shows | 3 | — |

3. **Advisors** line with a legend — "Free 1 · Busy 6 · Break 1 · Offline 1" — and a thin bar split by those four colours (green, near-black, ochre, light grey).
4. Attention list: up to five clay items, longest first, for example:
   - "Walk-in W-018 waiting 6 min past the time we told them (told 20 min)"
   - "Walk-in W-021 waiting 17 min (cap 15)"
   - "Appointment A-024 (11:30) not started, 9 min late"
   - "Ravi Menon on break 24 min (Coffee)"
   - "Priya Nair with A-020 for 41 min (expected 25)"
   When there is nothing, one green line: "Nothing needs attention".
5. Footer links: "Reception view" (opens that branch's reception page) · "Waiting-area screen ↗".

---

## Page 5 — Branch dashboard

One branch in depth for the manager, top to bottom: page heading, seven KPI tiles, four panels in a 2 × 2 grid (two charts, a third chart and an advisor table), the **What the system has learned** section (two panels), then the activity log.

**Page heading.** Small back link above the title: "← All branches". Title: branch name. Line under it: "Monday, 19 Oct 2026 · open 07:30–18:00". Link on the right: "Open reception view →".

### KPI tiles

| Label | Value | Hint | Clay when |
|---|---|---|---|
| Arrivals | 39 | 46% walk-ins | — |
| Served | 31 | 3 no-shows · 0 cancelled | — |
| Waiting now | 2 | longest 9 min | — |
| Walk-in wait | 6 min | max 30 min · cap 15 | the longest walk-in wait reached the cap |
| Appointments on time | 95% | avg delay 1 min | — |
| Wait promises kept | 83% | broken ones ran 8 min over (or: walk-ins called by the time told) | someone is waiting past the time told |
| Average desk time | 24 min | — | — |

### Panels

| Panel | Title | What it shows | Legend and labels | Hover |
|---|---|---|---|---|
| Chart | Arrivals by hour | Stacked columns, one per opening hour (07–17): appointments at the bottom, walk-ins on top | Appointments (green) · Walk-ins (ochre) | "08:00–09:00 — Appointments 5, Walk-ins 6" |
| Chart | Average wait by hour | One column per hour, plus a clay line at the walk-in cap | Minutes from arrival (or slot) to being called · Walk-in cap 15 min | "09:00 — Average wait 4.5 min" (or "no calls") |
| Chart | Desk time by service type | One horizontal bar per service (Service, Standard, Collection) with a dark tick at the configured minutes; the value at the bar end, clay when over | Average actual · Configured | "Service — Average 33 min, Configured 25 min, Visits 17" |
| Table | Advisors today | Advisor · Served · Appts · Walk-ins · Avg time · Over expected (clay above 50%) | — | — |

### What the system has learned
Section title **What the system has learned**, with "From the last 28 days at this branch · updates every 10 minutes" (or "Learning is off for this branch (Settings › Branches)").

**Panel 1 — Wait promises.** Title "Wait promises", with the note "what walk-ins feel is the wait against what they were told".
- Big green figure: "83%", under it "called by the time told (18)"
- "Quotes add **4%** to the forecast so about 8 in 10 walk-ins are called sooner than told."
- Small grey: "learned from 18 walk-ins over the last 28 days · forecast drift: typical 0 min, 8 in 10 within 0.6 min"
- Four outlined example chips: "forecast 5′ → told 10′", "forecast 15′ → told 20′", "forecast 30′ → told 35′", "forecast 60′ → told 65′"
- Column chart of walk-ins by how they were called against the time they were told, six columns: "10+ min sooner" · "5–10 sooner" · "0–5 sooner" (green) · "1–5 later" · "5–10 later" · "10+ min later" (ochre), each with its count on top. Legend: Called sooner than told · Called later than told.

**Panel 2 — Desk times.** Title "Desk times", with the note "used for every forecast and the "fits before the next appointment" check".

| Service | Configured | Measured | Visits | Now using |
|---|---|---|---|---|
| Service — under it "BMW 32′ · BMWi 31′ · MINI 33′" | 25′ | 33′ | 17 | 31′ (clay when 3+ min from configured) |

Then a small heading **ADVISORS AGAINST THE TEAM** and a table: Advisor · Service · Visits · Their time · Team · Difference ("5% faster", "+23% slower", "same"). Footnote: "Each figure starts at the configured minutes and moves toward what was measured as visits pile up; an advisor's own pace is used once they call a customer."

### Activity
Title "Activity", with "latest 40 · full log in Settings › Audit log". Table: Time · Who (mono username, or "simulator" / "system") · What ("check in", "walk in", "call", "start", "complete", "assign", "bump", "no show", "advisor status", "keyloop sync", "allocate") · Detail (e.g. "W-016 → Daniel Costa (Desk 3): Walk-in that fits before your next appointment").

---

## Page 6 — Settings

The manager's control room: a left-hand list of seven tabs, the selected tab's content on the right. Title: "Settings". Line under it: "Everything here applies at once and is written to the audit log." Tabs: **Branches & queue rules** · **Advisors** · **Service types & brands** · **Users & roles** · **Keyloop bookings** · **Audit log** · **Demo**. Several tabs open with an amber banner that names the open management question behind them.

### Tab 1 — Branches & queue rules
- Banner: "**Queue rules are placeholders** until management answers question 6 (maximum walk-in wait, grace for late customers). Each branch can have its own values."
- Card **Branches** with a **+ Add branch** button. Table: Code · Name · Hours (07:30–18:00) · Grace (15′) · Walk-in cap (15′) · Ceiling (25′ or "off") · Early (10′) · Learning ("28 days" or "off") · Status chip (Active / Inactive) · **Edit**.

**Branch dialog** (wide). Title "Add a branch" or "Edit Main Branch (SZR)".
- Fields: **Code** (placeholder "e.g. AUH") · **Name** · **Opens** · **Closes**; switch **Active**
- **Advisor for appointments** + amber tag "Placeholder · does Keyloop name one?", a drop-down of three choices: "Keyloop's advisor if the booking names one, otherwise the system allocates" · "The system allocates every appointment (balanced by skills and load)" · "Left open: reception picks the advisor at check-in"
- New branch only: "Reception login password (creates reception.<code>; optional)"
- Section **QUEUE RULES** + PLACEHOLDER tag: one row per rule — name in bold, explanation in grey, a number box on the right
- Buttons: **Cancel** · **Add branch / Save**

| Rule | Explanation shown | Default |
|---|---|---|
| Early window | An appointment can start this many minutes before its slot. | 10 |
| Grace for late arrivals | A late appointment customer keeps the slot for this long; after it they join as a walk-in, and a customer who never arrives is marked a no-show. | 15 |
| Walk-in wait cap | A walk-in who has waited this long goes ahead of appointments that are not due yet. | 15 |
| Walk-in hard ceiling | A walk-in who has waited this long goes ahead of everyone, even an appointment that is due (that appointment starts a few minutes late instead). 0 = off. | 25 |
| Safety buffer | A walk-in only goes to an advisor if it ends this many minutes before their next appointment. | 5 |
| Help after | Another advisor may take an appointment once it is this late and its own advisor is still busy. | 10 |
| Swap advisor if theirs is this far off | A walk-in waits for the advisor chosen at issue, unless that advisor will not be free for this many minutes and a colleague can see them now. 0 = only at the time told or the ceiling. | 10 |
| On-time target | An appointment counts as started on time if called within this many minutes of the later of slot and arrival. | 5 |
| Learn from the last (days) | Desk times and the wait-quote margin are learned from this many days of history. 0 = use the configured minutes and a fixed +20% margin. | 28 |
| Walk-ins called by the time told (%) | The quote margin is set so this share of walk-ins are called before the time reception told them. Higher = more cautious quotes. | 80 |

### Tab 2 — Advisors
- Card **Service advisors**, a branch filter ("All branches" or one branch), and a **+ Add advisor** button
- Table: Name · Branch · Desk · Takes ("All customers" / "Appointments only" / "Walk-in desk" / "Express desk") · Brands ("All" or "MINI") · Services ("All" or "Collection") · Login (mono username, or "none") · **Edit**. Inactive advisors are faded.

**Advisor dialog** (wide). Title "Add an advisor" or "Edit Omar Haddad". Fields: **Name** · **Branch** · **Desk** (placeholder "Desk 3") · **Takes** (the four options above). **BRANDS** and **SERVICE TYPES** as toggle pills, with the hint "none picked = every brand" / "none picked = every service". Switch **Active**. When the advisor has no login yet: **Login username (optional)** (placeholder "firstname.branch") and **Password**. Buttons: **Cancel** · **Add advisor / Save**.

### Tab 3 — Service types & brands
- Banner: "**Placeholder service types** copied from the current RSI system (Service, Standard, Collection). What they mean and how long each takes is question 5 for management."
- Card **Service types** with **+ Add**. Table: Code · Name · Expected minutes · Lane ("Express" amber chip, or "Regular") · Ticket letter ("C", or "A / W") · Status (Active / Off) · **Edit**
- Card **Brands** + PLACEHOLDER tag: "Comma-separated. Which brands go through this queue is question 5." A text box ("BMW, MINI, BMWi") and **Save** (message "Brands saved")

**Service type dialog.** Title "Add a service type" or "Edit Service". Fields: **Code** (locked after creation) · **Name** · **Expected minutes at the desk** · **Ticket letter** (blank = A/W). Switches: **Express lane (short visits, e.g. collection)** · **Active**. Buttons: **Cancel** · **Save**.

### Tab 4 — Users & roles
- Banner: "**Sign-in is a placeholder.** Usernames and passwords for now; AGMC Microsoft sign-in (SSO) replaces them (question 8). A branch-manager role (one branch only) can be added if management wants it (question 7)."
- Card **Users & roles** with **+ Add user**. Table: Username (mono) · Name · Role ("Manager — all branches" / "Reception — one branch" / "Service advisor — own desk") · Branch · Status (Active green / Blocked clay) · **Edit**

**User dialog.** Title "Add a user" or "Edit reception.szr". Fields: **Username** (locked after creation) · **Name** · **Role** · **Branch** ("Pick a branch"; hidden for managers) · **Advisor** ("Pick the advisor"; advisors only) · **Password** or **New password (leave blank to keep)**. Switch **Can sign in**. Buttons: **Cancel** · **Save**.

### Tab 5 — Keyloop bookings
- Banner: "**Bookings come from a mock Keyloop source** that invents a realistic day per branch and, like an online booking, names no advisor. Question 3 (Keyloop API or a scheduled export file) decides the real connector; only that connector changes."
- Card **When bookings are loaded** + chip "Source: mock":
  - "**The night before:** tomorrow's bookings load at [22:00 time box] [Save] and every appointment gets its advisor, so advisors see their day before it starts."
  - "**During the day:** every 10 minutes, for same-day bookings, moves and cancellations."
- Card **Bookings per branch** with **Load tomorrow now** (message "Tomorrow's bookings loaded"). Table: Branch · Advisor for appointments · Today (63) · Today's advisors ("63 allocated" or "12 named by Keyloop · 51 allocated · 2 open") · Tomorrow ("not loaded" or a count) · Tomorrow's advisors ("loads at 22:00") · **Sync today** (message "Today synced")
- Card **Sync history**. Table: Time · Branch · Source · Added · Updated · Removed · Note ("63 bookings for 2026-10-19")

### Tab 6 — Audit log
Card **Audit log** with a branch filter and "latest 400". Table: Time ("19 Oct, 11:45") · Branch (SZR) · Who (mono) · What · Detail. Every check-in, call, override, setting change and sign-in appears here.

### Tab 7 — Demo (prototype only; removed in the real system)
- Card **Live simulator**: "While on, appointment customers arrive (some early, some late, a few never) and walk-ins come in at about the RSI rate. Advisors that nobody is signed in as call, serve and finish customers by themselves." Switch **On / Off** (messages "Simulator on" / "Simulator off"). Clay button **Reset today's demo data**, which asks first: "Wipe today's tickets and replay the day from opening time?" (message "Today's demo replayed")
- Card **Who drives each advisor**, with "signing in as an advisor takes over from the simulator". Table: Advisor · Branch · Login · Simulated (switch: "Simulator" / "A person")

---

## Page 7 — Waiting-area TV

A 1920 × 1080 landscape screen in the customer lounge, read from several metres away. It shows ticket numbers and desks only: never names, plates or phone numbers. No sign-in; one screen per branch (/display/SZR, /display/MC).

**Header** (green band): AGMC logo (white) · divider · "Main Branch (SZR) · Service reception" · a large live clock on the right ("11:02").

**Left, about two-thirds of the width**
- Small caps heading: NOW CALLING
- One wide row per customer being called, newest first: the ticket number very large in mono ("A-014") and "→ Desk 2" in large green type on the right. A call from the last 20 seconds is a solid green row with white text, pulsing a few times; older calls are white rows.
- When nobody is being called, one grey row: "Please wait — you will be called shortly"
- Small caps heading: AT THE DESKS — a grid of small tiles "W-015 Desk 1" for everyone currently being served

**Right, about one-third**
- Small caps heading: NEXT — up to ten ticket numbers in mono tiles, in the order they will be called
- Large count: "3 waiting"
- Grey line: "Appointments are called at their booked time; walk-ins in order of arrival between them."

**Footer** (thin rule above): left "Please keep your ticket number ready." · right "AGMC Aftersales"

**Not built yet (placeholder):** a chime when a number is called, and Arabic text alongside English.

---

## Shared wording

The same words and colours mean the same thing on every page. Use this list as the single source when designing chips, labels and messages.

### Ticket numbers

| Prefix | Meaning | Example |
|---|---|---|
| A | Appointment | A-014 |
| W | Walk-in | W-018 |
| C | Collection (express lane), appointment or walk-in | C-004 |

Numbers restart at 001 each day per branch and prefix.

### Ticket statuses (chips)

| Status | Chip text | Colour |
|---|---|---|
| Booked, not arrived | Booked | grey |
| Checked in, in the queue | Waiting | blue |
| Called to a desk | Called | amber |
| At the desk | With advisor | dark green, white text |
| Finished | Done | green |
| Did not come | No-show | clay |
| Cancelled | Cancelled | grey |

### Customer types (chips)

| Chip | Colour | When |
|---|---|---|
| Appointment 12:30 | green | Booked customer, on time or early |
| Walk-in | outlined | No booking |
| Late appt 11:00 · walk-in | amber | Booked but arrived after the grace window; queues as a walk-in |

### Advisor states (chips with a dot)
Available (green) · Calling (amber) · Serving (dark green) · On break (amber) · Offline (grey).

### Desk types
All customers · Appointments only · Walk-in desk · Express desk.

### How an appointment's advisor was chosen
(booked in Keyloop) · (allocated) · (picked at reception) · no advisor yet.

### Why this customer is next (advisor desk and activity log)

| Reason | When |
|---|---|
| Handed over to you by a colleague | A colleague transferred the customer to this advisor |
| Walk-in at the hard ceiling | A walk-in reached the ceiling (25 min) |
| Your appointment is due | This advisor's own appointment is within its early window |
| Another advisor's appointment is waiting | Covering a colleague who is away or running late |
| Moved to the front by reception | Reception used "Move to front" |
| Walk-in over the wait cap | A walk-in passed the cap (15 min) |
| Covering a colleague's walk-in so we keep the time we told them | The chosen advisor is far off or the told time has passed |
| Walk-in that fits before your next appointment | The normal case for walk-ins |
| Appointment arrived early | Nothing else is waiting, so an early appointment starts now |

### Success messages (dark toasts)
- Reception: Advisor changed · Moved to the front · Marked as no-show · Ticket cancelled
- Advisor: You're available · Enjoy your break · Signed off the queue · Calling A-021 · Started · Called again · Back in the queue · Done — nice work · Transferred
- Settings: Branch added · Advisor added · Saved · Brands saved · Tomorrow's bookings loaded · Today synced · Simulator on / off · Today's demo replayed

### Problem messages (clay toasts, shown as written)

| Area | Messages |
|---|---|
| Sign in and access | Wrong username or password · Please sign in again. · Your role cannot open this · Not your branch · This account is not linked to an advisor |
| Reception | Only a booked appointment can be checked in · This appointment is not for today · Give a reason — every override is logged · Appointments keep their slot — change its advisor instead · Only a waiting ticket can be moved to the front · Only a waiting or booked ticket can be moved · This ticket can no longer be cancelled · This ticket can no longer be marked as a no-show · Advisor not in this branch · Unknown service type |
| Advisor desk | Set yourself Available first · Finish your current customer first · Nobody is waiting for you right now · No customer in that state at your desk · Finish or transfer your current customer first |
| Settings | A branch with that code exists · Code: letters and digits only · Opening hours must be HH:MM and open before close · Time must be HH:MM · Reception password: at least 8 characters · Password: at least 8 characters · Username: 3–64 of a-z 0-9 . _ - · That username is taken · Reception and advisor accounts belong to a branch · Pick the advisor this login belongs to · This advisor is serving someone — move them after · You cannot remove your own manager access · A service type with that code exists · Keep at least one brand |

---

## Global project rules (from the owner)

- **Smooth scrolling:** include Lenis. Wrap the app root with `ReactLenis` from `lenis/react` using `{ lerp: 0.1, smoothWheel: true }` and import `lenis/dist/lenis.css`. Use lerp 1 when `prefers-reduced-motion` is set. Add `data-lenis-prevent` to modals, dropdowns, inner scrollable containers (appointment list, menus, dialogs). Use `lenis.scrollTo` (via `useLenis`) instead of `href="#..."`. The TV page does not scroll; Lenis can be skipped there.
- **Scroll reveal:** `motion` (`whileInView`, `viewport={{ once: true }}`, ease `[0.16, 1, 0.3, 1]`) — keep it subtle on working screens.
- **Density:** the owner prefers compact, dense UI — do not oversize anything beyond the sizes above.
