# AGMC Queue: user guide

Short, task-first instructions for each role. Labels in **bold** are the exact words on screen. For demo sign-ins, see the [README](../README.md#demo-accounts) (password `agmc-demo`).

Every page updates live, so you never need to refresh. A dark message at the bottom of the screen confirms that an action worked. A clay (red-brown) message tells you why it did not.

---

## Reception

Open **Queue** in the top bar (`/reception`). Use the **Check in** panel on the left and the **Queue** on the right.

### Check in an appointment
1. In **Check in**, keep **Appointment** selected.
2. Search by name, plate, mobile or Keyloop ref, or pick from today's list. Rows are sorted most relevant first.
3. Read the status chip. **Due now** and **in 28 min** are normal. **4 min late** is still inside the grace window. **18 min late · walk-in** means they will queue as a walk-in.
4. Click **Check in**. If no advisor is set yet, a dialog asks you to pick one (or **Whoever is free first**). Then click **Check in** again.
5. The ticket appears (e.g. A-014). Read out the line starting "Tell them:", then click **Next customer**.

To set the advisor before check-in, click **change advisor** on the row, choose one, and click **Check in**. This checks the customer in at the same time.

### Issue a walk-in ticket
1. In **Check in**, choose **Walk-in**.
2. Pick **SERVICE** and **BRAND**.
3. Under **ADVISOR**, the soonest advisor is already selected (**Soonest** chip). Choose another one, or **Whoever is free first**, if the customer prefers.
4. Fill in **Customer name**, **Mobile**, **Plate**, **Vehicle** and an optional **Note**.
5. Click **Issue walk-in ticket**.

**What to tell the customer.** Read the green quote box, under "Tell the customer":
- The big line is the wait: "About 15 min".
- Then who will see them and the latest call time: "**Ravi Menon** will see them · called by **12:56**".
- If the box turns clay and says "Long wait — offer to leave the car (drop-off) or book a slot.", offer a drop-off or a booking. Do the same for "Would finish after closing".
- "No advisor can take this now" means no advisor present handles that brand or service.

The quote includes a safety margin, so most walk-ins are called sooner than told. On the issued ticket, use **Print ticket**. **Send SMS** is a placeholder and does not work yet.

### Steer the queue
Open the **•••** menu at the end of a queue row.

| Action | When | Notes |
|---|---|---|
| **Change advisor…** | The customer wants someone else, or their advisor is away | They keep their place by arrival time. Tell them who will see them now. |
| **Move to front…** | Elderly customer, VIP, came back after a drop-off | Walk-ins only. A reason is required, and every override is logged. |
| **Mark no-show** | The customer has left | Closes the ticket as a no-show. |
| **Cancel ticket…** | The visit is no longer needed | Closes the ticket and removes it from the queue. |

Rows with a clay background are walk-ins waiting past the time they were told. Deal with those first.

**Advisors**, **Appointments not arrived** and **Recently finished** below the queue are read-only.

---

## Service advisor

Open **My desk** (`/advisor`). The big card shows what to do next.

### Status
Use the switch at the top right:
- **Available**: you take customers.
- **Break**: pick a reason (Coffee, Prayer, Lunch, Workshop, Meeting), then click **Start break**. A colleague can cover your appointments that come due meanwhile.
- **Offline**: you are off the queue.

You cannot change status while a customer is at your desk. Finish or transfer them first. To come back from a break or offline, click **I'm back — available** on the card.

### Serve a customer
1. **Call.** When the card says READY with "Next for you", click **Call A-021**. The TV shows the ticket and your desk. The line under it says why this customer is next.
2. **Start.** When they reach you, click **Customer is here — start**. If they do not come, use **Call again**, then **Not here — back to queue** or **No-show**.
3. **Serve.** The timer runs against the expected time and turns clay when over. You can add a "Note for this visit (optional)".
4. **Complete.** Click **Complete**.

### Transfer
While serving, click **Transfer…**. Under **To**, choose a colleague or **Next free advisor** (the customer keeps the front of the queue). **Reason** is optional. Click **Transfer**.

### Plan ahead
- **Your line** lists who is waiting for you. Pull up their vehicles in Keyloop before they reach your desk.
- **My day** lists your appointments and walk-ins in time order, with your on-time rate.

---

## Manager

### Overview (`/manager`)
- The top tiles are group totals. A clay tile needs attention.
- There is one card per branch. A clay figure needs a look. The **Advisors** bar shows how many advisors are Free, Busy, on Break or Offline.
- The attention list on each card shows up to five problems, longest first: walk-ins past the told time or over the cap, late appointments, long breaks, and long desk times. "Nothing needs attention" means all is well.
- From a card, open **Dashboard →**, **Reception view**, or **Waiting-area screen ↗**. In the reception view, switch branch with the picker in the top bar.

### Branch dashboard (`/manager/branch/<id>`)
- **Arrivals by hour**: appointments (green) and walk-ins (ochre) per hour.
- **Average wait by hour**: the clay line is the walk-in cap.
- **Desk time by service type**: the actual average against the configured time (dark tick). Bars over the configured time turn clay.
- **Advisors today**: per-advisor counts. "Over expected" turns clay above 50%.
- Hover a chart for exact values.

**What the system has learned**
- **Wait promises**: the share of walk-ins called by the time they were told, the margin added to quotes, and how early or late calls were against the quote.
- **Desk times**: configured, measured and now-used minutes per service. "Now using" turns clay when it is 3 or more minutes from the configured value. **ADVISORS AGAINST THE TEAM** compares each advisor's pace with the team.

**Activity** shows the latest 40 events. The full log is in Settings › Audit log.

### Settings (`/manager/settings`)
Every change applies at once and is written to the audit log.

| Task | Where |
|---|---|
| Change queue rules (grace, walk-in cap, ceiling, learning days, promise target…) | **Branches & queue rules** › **Edit** on a branch › **QUEUE RULES** › **Save** |
| Add a branch | **+ Add branch** (or "+ Add a branch" on the overview). Optionally set a reception password, which creates `reception.<code>` |
| Add an advisor | **Advisors** › **+ Add advisor**. Set desk, **Takes**, brands and services (none picked = all). Add a login if they will sign in |
| Add a user | **Users & roles** › **+ Add user**. Pick a role, then a branch (reception and advisor) and the advisor (advisor role) |
| Service types and brands | **Service types & brands** › **+ Add** / **Edit**. Brands are comma-separated, then **Save** |
| Keyloop loads | **Keyloop bookings**. Set the nightly load time and **Save**. **Load tomorrow now** loads all branches; **Sync today** syncs one branch. **Sync history** lists past loads |
| Find who did what | **Audit log**, with a branch filter |
| Demo controls | **Demo**: simulator **On / Off**, **Reset today's demo data**, and **Who drives each advisor** (Simulator / A person) |

If a value is invalid, the error shows under the field and as a message at the bottom.

---

## Waiting-area TV

1. On the TV's browser, open `/display/<CODE>`, e.g. `/display/SZR` or `/display/MC`. No sign-in is needed. From Reception, "Open waiting-area screen ↗" opens the same page.
2. Make the browser full screen (F11 on most browsers). The 1920 × 1080 layout scales to fit any screen.

The TV shows only ticket numbers and desks, never names, plates or phone numbers. An unknown or inactive branch code shows "Screen not available: <reason>". Chime and Arabic text are not built yet.

In this prototype the TV must run in the same browser as the other pages, because data is shared through the browser.
