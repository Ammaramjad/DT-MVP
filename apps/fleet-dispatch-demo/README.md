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
| **Customer Booking** | `/booking` | The booking flow a customer would use: pickup/drop-off, live order-type classification (Airport Pickup / Airport Drop-off / Tour Charter), mock flight lookup, vehicle type, live fare + distance estimate, and a mini live-map preview. Submitting creates a real order in the shared store. |
| **Central Control System** | `/control` | The dispatch "mission control" — KPI counters, a filterable order queue, a live fleet map with all vehicles, an auto-dispatch engine toggle, driver document/OCR expiry alerts, and a LINE@-style notification feed. |
| **Driver App** | `/driver` | A mobile-styled app for the assigned driver — job card (customer, pickup/drop-off, flight info), a live GPS-style map, and a `Start Trip → Arrived → Picked Up → Completed` action flow. |
| **Customer Live Tracking** | `/customer` | An Uber-style "track your ride" page: driver card, live ETA/distance, a status timeline, and the same live-moving map marker the driver is generating. |

## How the "live system" illusion works

All four panels read from and write to **one Zustand store** (`src/store/useFleetStore.ts`). Because panel
navigation uses React Router's client-side routing (no full page reloads), the store stays alive in memory as you
switch views — so:

1. Booking a ride in the **Booking** panel pushes a new order into the shared store, instantly visible in the
   **Control Center** queue.
2. Assigning a driver (either manually with one click, or automatically via the simulated priority-dispatch engine:
   owned fleet → paid members → outside contractors) updates the order and marks the driver busy — this is what the
   **Driver App** picks up as "your next job."
3. Starting the trip in the **Driver App** kicks off a simulation ticker (`useFleetStore.tick()`, every 1.5s) that
   moves the vehicle along a generated route, one interpolated step at a time.
4. That same position update is read by the **Control Center**'s fleet map and the **Customer Tracking** panel's
   live map — so the marker moves in all three places, in real time, from a single source of truth.
5. The order status lifecycle (`New → Assigned → Driver En Route → Arrived → Picked Up → In Transit → Completed`)
   advances automatically as the vehicle reaches each waypoint, firing simulated LINE@-style notifications along the
   way.

The app seeds a handful of "already in progress" orders/drivers on load (see `src/data/seed.ts`) so the demo never
starts empty, and the Control Center can optionally keep generating ambient incoming orders from other channels
(KKday, Booking.com, LINE@, etc.) to simulate the cross-platform order-aggregation module.

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

Two Playwright scripts live in `e2e/` (make sure `npm run dev` is running first, then in another terminal):

```bash
npm run test:e2e:smoke      # visits every panel, fails on any console/page error
npm run test:e2e:lifecycle  # books a real order and drives it through all 4 panels to completion
```

`test:e2e:lifecycle` is the best single proof that the "connected system" illusion works: it creates a booking,
waits for (or triggers) dispatch in the Control Center, starts the trip in the Driver App, and confirms the same
live position + status is mirrored in the Customer Tracking panel until the order reaches `Completed`.

## What's simulated vs. what would be real integrations

This prototype demonstrates the **Phase 1** and **Phase 2** modules from the product blueprint. Nothing here talks
to a real backend — everything below is simulated client-side, with a note on what a production build would need.

### Phase 1 (foundation)

| Module | In this prototype | In production |
|---|---|---|
| Cross-platform order aggregation | Orders can arrive from a simulated Website/LINE@/KKday/Booking.com/Klook/Phone channel picker, and the Control Center can auto-generate ambient orders from random channels | Real webhook/API integrations per channel into a central orders table |
| Data analytics dashboards | Live KPI counters (active orders, available drivers, revenue, on-time %) computed client-side | A real analytics/reporting service over historical order data |
| Address map + translation | Preset bilingual (EN/中文) location list with real Taipei-area coordinates | Google Maps Geocoding/Places API + address translation service |
| Driver integration platform | Static seeded driver roster with tiers and documents | Driver onboarding portal, identity verification, bank/payout integration |
| Control dashboard + auto-forms | Order queue with one-click "Assign" and an auto-dispatch suggestion | Same UX, backed by a real dispatch service |
| Driver interface | Mobile-styled job card with start/arrive/pick-up/complete flow | Native driver mobile app with push notifications & background GPS |
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
| LINE@ notifications | In-app toast + notification feed styled like LINE@ messages | Real LINE Notify / LINE@ Messaging API integration, plus SMS/voice fallback |
| Touch-map drag dispatch | Not implemented (one-click assign is the stand-in for this demo) | Drag-and-drop dispatch on a touch-screen big board |

Phase 3 (in-app payments, driver/customer app-store releases) is intentionally out of scope for this prototype — the
landing page includes a small "coming soon" roadmap nod for it.
