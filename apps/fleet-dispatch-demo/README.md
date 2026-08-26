# 走瘋派車 Fleet Dispatch — Live Prototype

A polished, fully client-side **demo prototype** of the 走瘋派車 (Zou Feng Pai Che) airport-transfer & fleet-dispatch
platform, built to show a client the end-to-end product vision. There is no real backend, no payments, and no live
third-party APIs — every "live" data point (orders, drivers, GPS positions, flight status, notifications) is
simulated in the browser by a single shared store, so the four panels below feel like one connected, real-time
system.

## The four panels

The app is a single-page React app with four routes, switchable at any time from the floating "Switch view" bar at
the bottom of the screen:

| Panel | Route | What it shows |
|---|---|---|
| **Landing** | `/` | Marketing-style entry screen with a 3D hero (rotating vehicle + floating map pins) and quick links into the other three panels. |
| **Customer Booking** | `/booking` | The booking flow a customer would use: pickup/drop-off, live order-type classification (Airport Pickup / Airport Drop-off / Tour Charter), mock flight lookup, vehicle type, live fare + distance estimate, and a mini live-map preview. Submitting creates a real order in the shared store and shows an animated hand-off into the Control Center queue. |
| **Central Control System** | `/control` | The dispatch "mission control" — 6 KPI counters (active/unassigned orders, available drivers, anomalies, revenue, drivers on leave today), a filterable order queue with a per-order **multi-channel dispatch + escalation log**, a live fleet map with all vehicles (unresponsive drivers pulse red), an auto-dispatch engine toggle, driver document/OCR expiry alerts, a live notification feed with channel badges, and a **Capacity Forecast / Driver Schedule / Fleet Roster** tab group modeled after a reference "Fleet OS" scheduling dashboard. |
| **Driver App** | `/driver` | A mobile-styled app for the assigned driver — an **order-stats header** (today/this-week/all-time counts, accepted/declined/missed, completion rate), an **incoming-request card** with a live countdown ring, channel badges, and Accept/Decline buttons when a job is being dispatched, the active job card (customer, pickup/drop-off, flight info), a live GPS-style map, a `Start Trip → Arrived → Picked Up → Completed` action flow, and a job history list. |
| **Customer Live Tracking** | `/customer` | An Uber-style "track your ride" page with two tabs: **Live Tracking** (driver card, live ETA/distance, a status timeline, a "contacting your driver" countdown while dispatch is in progress, and the same live-moving map marker the driver is generating) and **My Bookings** (booking-frequency analytics — total rides, breakdown by pickup/type, "repeat customer since…" — plus a full history list per customer). |

## How the "live system" illusion works

All four panels read from and write to **one Zustand store** (`src/store/useFleetStore.ts`). Because panel
navigation uses React Router's client-side routing (no full page reloads), the store stays alive in memory as you
switch views — so:

1. Booking a ride in the **Booking** panel pushes a new order into the shared store, instantly visible (with a
   pulsing "fresh arrival" animation) in the **Control Center** queue.
2. Dispatching a driver — either automatically via the priority-dispatch engine (owned fleet → paid members →
   outside contractors) or manually with one click — doesn't instantly assign them. It starts a **multi-channel
   notification + escalation attempt** (see below): the order enters `Notifying Driver`, the driver's app shows an
   incoming request, and the Control Center shows a live countdown and channel badges until the driver responds (or
   the ladder escalates/times out).
3. Once a driver accepts (via the Driver App's Accept button, or the simulated auto-accept chance each tick), the
   order becomes `Assigned` and the driver's app shows it as "your next job."
4. Starting the trip in the **Driver App** kicks off a simulation ticker (`useFleetStore.tick()`, every 1.5s) that
   moves the vehicle along a generated route, one interpolated step at a time.
5. That same position update is read by the **Control Center**'s fleet map and the **Customer Tracking** panel's
   live map — so the marker moves in all three places, in real time, from a single source of truth.
6. The order status lifecycle (`New → Notifying Driver → Assigned → Driver En Route → Arrived → Picked Up → In
   Transit → Completed`) advances automatically as the vehicle reaches each waypoint, firing simulated multi-channel
   notifications along the way — visible in the Control Center's notification feed, the order's own dispatch log,
   and (once completed) the customer's booking history.

The app seeds a handful of "already in progress" orders/drivers on load (see `src/data/seed.ts`) so the demo never
starts empty, and the Control Center can optionally keep generating ambient incoming orders from other channels
(KKday, Booking.com, LINE@, etc.) to simulate the cross-platform order-aggregation module.

## Multi-channel driver notification + escalation ladder

This is the core Phase 2 workflow the client asked to see modeled with real depth, not just a happy path. When
Fleet OS dispatches an order to a driver (`assignOrder` / the auto-dispatch engine in `useFleetStore.ts`), it starts
a **dispatch attempt** rather than instantly assigning them:

1. **Stage 1 — In-App Push.** The order status becomes `PENDING_DRIVER_RESPONSE`. The Control Center's order card,
   the Driver App's incoming-request card, and the Customer Tracking panel all show a live countdown ring (8–15
   simulated seconds) and an `In-App Push` channel badge. The driver can tap **Accept** or **Decline** in the Driver
   App (or the simulation auto-accepts with some probability each tick, to keep the demo moving on its own).
2. **Escalation to Stage 2 — LINE Message + Phone Call.** If the driver doesn't respond before the countdown
   expires, the attempt is marked `TIMED_OUT` and a new attempt starts on the same order — this time notifying via
   **LINE Message** and **Phone Call** simultaneously (with its own countdown). Both the Control Center's
   notification feed and the order's own dispatch log record this as `Escalating — No Response via In-App`.
3. **Unresponsive + reassignment.** If stage 2 also times out, the driver is flagged **unresponsive** (a red pulsing
   marker on the fleet map, a red banner on the order card, and an "Anomalies" KPI bump for
   `UNRESPONSIVE_FLAG_MS` = 20s) and the order is requeued as `New` with a fresh driver suggestion and a **Reassign**
   button, ready to be dispatched to the next available driver in priority order (owned fleet → paid members →
   outside contractors).

Every attempt — channels used, timestamps, and outcome — is kept on `order.dispatchAttempts` and rendered as a
collapsible **Dispatch Log** on the order card, so the full audit trail survives even after the order resolves.

### Demoing the "driver doesn't respond" path live

Each order card in the Control Center (while it's `New` or `Notifying Driver`) has a **"Demo: simulate driver not
responding"** toggle (`data-testid="demo-no-response-toggle"`). Turning it on before dispatching (or while a
dispatch attempt is in flight) forces that order's driver to never auto-accept, so clicking **Assign** plays out the
full escalation ladder above end-to-end — stage 1 timeout → stage 2 escalation → timeout → unresponsive/reassign —
instead of resolving instantly. It's also useful to turn off the header's **Auto-Dispatch** toggle first, so ambient
orders don't race the one you're demoing.

## Control Center: capacity forecast, driver schedule & fleet roster

The client referenced [zhaofeng.workhive.uk](https://zhaofeng.workhive.uk/) — a "Fleet OS" scheduling dashboard
(排班總覽) whose core value is "today's ops status, 30-day capacity, and driver scheduling at a glance." Rather than
cloning its exact visuals, the Control Center now surfaces the same *data concepts* against this app's own simulated
data model, in a tabbed section below the live order queue and map:

- **Capacity Forecast** — a 30-day heatmap calendar (`buildCapacityForecast` in `src/lib/capacity.ts`) showing
  projected order volume per day (darker = busier, peak days flagged), scheduled drivers, and drivers on leave, plus
  a same-day hourly order-volume chart.
- **Driver Schedule** — a driver × day shift matrix (`buildShiftSchedule`) showing day/night/off shifts 14 days out,
  with manually-adjusted shifts marked.
- **Fleet Roster** — a breakdown of the driver fleet by tier (owned fleet / paid member / outside contractor) and a
  live list of any drivers currently flagged unresponsive.

All of this is deterministic (seeded with `mulberry32`) so numbers stay stable across reloads but still feel like
real operational data, and it's wired into the same KPI row (`Unassigned`, `Anomalies`, `On Leave Today`) at the top
of the panel.

## Tech stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** for styling (dark "mission control" theme for dispatch/driver views, bright theme for
  customer-facing views)
- **Zustand** for the single shared client-side store + simulation engine
- **Framer Motion** for panel transitions, animated counters, status badges, and toast notifications
- **@react-three/fiber + @react-three/drei (three.js)** for the 3D hero vehicle on the landing page and the vehicle
  spinner on the booking panel
- **react-leaflet + OpenStreetMap tiles** for real maps (no API key required). If tile access is unavailable, the
  app automatically falls back to a fully offline, stylized SVG/canvas map (`FleetMapFallback` /
  `RouteMapFallback`) so the demo always looks intentional and keeps working — see `useMapHealthCheck`.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`). Use the floating nav bar at the bottom to
jump between panels, or start at the landing page.

```bash
npm run build      # production build
npm run lint       # oxlint
```

## Automated end-to-end tests

Playwright scripts live in `e2e/` (make sure `npm run dev` is running first, then in another terminal):

```bash
npm run test:e2e:smoke      # visits every panel, fails on any console/page error
npm run test:e2e:lifecycle  # books a real order and drives it through all 4 panels to completion
```

`test:e2e:lifecycle` is the best single proof that the "connected system" illusion works: it creates a booking,
waits for a real driver to accept the dispatch (working through the multi-channel escalation ladder if needed),
starts the trip in the Driver App, and confirms the same live position + status is mirrored in the Customer Tracking
panel until the order reaches `Completed`.

There are also three demo/recording helper scripts (not part of CI, but handy for re-generating walkthrough
artifacts or exploring a flow yourself) — these open a **real, visible** browser window rather than running headless:

```bash
npm run demo:escalation   # books a ride, forces "driver won't respond", plays out the full escalation ladder
npm run demo:features     # tours the enriched Control Center, accepts a live request in the Driver App, then customer history
npm run demo:screenshots  # headless — captures PNGs of each key new UI surface into /opt/cursor/artifacts
```

## What's simulated vs. what would be real integrations

This prototype demonstrates the **Phase 1** and **Phase 2** modules from the product blueprint. Nothing here talks
to a real backend — everything below is simulated client-side, with a note on what a production build would need.

### Phase 1 (foundation)

| Module | In this prototype | In production |
|---|---|---|
| Cross-platform order aggregation | Orders can arrive from a simulated Website/LINE@/KKday/Booking.com/Klook/Phone channel picker, and the Control Center can auto-generate ambient orders from random channels | Real webhook/API integrations per channel into a central orders table |
| Data analytics dashboards | Live KPI counters (active/unassigned orders, available drivers, anomalies, revenue, on-leave-today), a 30-day capacity forecast heatmap, hourly volume chart, and driver shift-schedule matrix, all computed client-side | A real analytics/reporting service over historical order data |
| Address map + translation | Preset bilingual (EN/中文) location list with real Taipei-area coordinates | Google Maps Geocoding/Places API + address translation service |
| Driver integration platform | Static seeded driver roster with tiers, documents, per-driver order stats (today/week/all-time, accepted/declined/missed, completion rate), and a 14-day shift schedule | Driver onboarding portal, identity verification, bank/payout integration |
| Control dashboard + auto-forms | Order queue with one-click "Assign"/"Reassign", an auto-dispatch suggestion, and a per-order multi-channel dispatch/escalation audit log | Same UX, backed by a real dispatch service |
| Driver interface | Mobile-styled job card with an incoming-request accept/decline flow (countdown + channel badges) and a start/arrive/pick-up/complete flow | Native driver mobile app with push notifications & background GPS |
| Customer booking history | Per-customer profile with booking-frequency analytics ("N rides booked · M from Taoyuan Airport · repeat customer since…") in the Customer Tracking panel's "My Bookings" tab | Real customer accounts + order history backed by the orders database |
| Order classification (3 types) | Automatic classification from pickup/drop-off location type | Same logic, applied to real geocoded addresses |
| Flight-time API integration | `lookupFlight()` deterministically fakes airline/gate/delay from the flight number | A real flight-status API (e.g. FlightAware, AviationStack) |

### Phase 2 (automation)

| Module | In this prototype | In production |
|---|---|---|
| Central dispatch platform | Single shared store driving all 4 views live | Real-time backend (WebSocket/Firebase-style) syncing many real devices |
| User permission roles | Implied by the 4 panels (customer/dispatcher/driver) but not access-controlled | Real auth + role-based access control |
| Driver document auto-review | Static expiry dates with `VALID`/`EXPIRING`/`EXPIRED` badges in the Control Center's alert list | OCR pipeline reading uploaded license/insurance photos + scheduled expiry checks |
| Automatic dispatch engine | Priority simulation: owned fleet → paid members → outside contractors, nearest driver first | Same priority logic, running against real driver locations & availability |
| Emergency / temporary dispatch | Not implemented in this prototype (roadmap nod on the landing page) | Conflict detection + re-routing logic |
| Customer live-location system | "Share secure tracking link" button (copies a fake URL) + the live tracking panel itself | Real signed tracking links, email delivery, expiring tokens |
| Fleet map monitoring | Control Center's live Leaflet map with all vehicle markers | Same, at production scale with clustering |
| Route cost logic | `estimateFare()` computes price from distance, vehicle type, and airport surcharge | Same formula shape, tuned with real cost data |
| Multi-channel driver notifications | Simulated **In-App Push → LINE Message + Phone Call** escalation ladder with live countdowns, channel badges, and a full per-order dispatch audit log (see above) | Real LINE Messaging API / Notify, push notification service (FCM/APNs), and telephony (e.g. Twilio Voice) integrations, with real delivery/read receipts |
| Unresponsive-driver handling | Drivers who miss both escalation stages are auto-flagged (red pulsing map marker + Control Center alert) and the order is requeued with a one-click "Reassign" to the next priority driver | Same logic, backed by real driver presence/heartbeat signals and possibly automatic reassignment without a human click |
| Touch-map drag dispatch | Not implemented (one-click assign/reassign is the stand-in for this demo) | Drag-and-drop dispatch on a touch-screen big board |

Phase 3 (in-app payments, driver/customer app-store releases) is intentionally out of scope for this prototype — the
landing page includes a small "coming soon" roadmap nod for it.
