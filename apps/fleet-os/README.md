# 走瘋派車 Zhaofeng Travel — Fleet OS Live Prototype

A polished, fully client-side **demo prototype** of the Zhaofeng Travel (走瘋派車) Taiwan airport-transfer, city-ride,
and private-charter platform, built around a central **Fleet OS**. There is no real backend, no payments, and no
live third-party APIs — every "live" data point (orders, drivers, GPS positions, flight status, notifications,
suppliers, campaigns, refunds…) is simulated in the browser by a single shared store, so every screen feels like one
connected, real-time system even though each app is designed and branded as a genuinely standalone product.

## Route map

| Area | Canonical route(s) | Old route | Still works? |
|---|---|---|---|
| Landing / sales pitch | `/` | — | — |
| **Marketplace** (OTA-style discovery) | `/marketplace` | — (new) | — |
| Booking checkout | `/booking` | — | yes, canonical entry point for checkout |
| **Fleet OS** — Orders & Dispatch (dashboard) | `/fleet-os`, `/fleet-os/orders` | `/control` | yes — `/control` **redirects** to `/fleet-os` (`<Navigate replace>`) so old bookmarks/links keep working |
| Fleet OS — Suppliers | `/fleet-os/suppliers` | — (new) | — |
| Fleet OS — Catalog & Inventory | `/fleet-os/catalog` | — (new) | — |
| **Fleet OS — Dynamic Pricing Service** | `/fleet-os/pricing/dynamic` | — (new) | — |
| **Fleet OS — Fleet & Vehicle Inventory** | `/fleet-os/vehicles` | — (new) | — |
| Fleet OS — Campaigns & Coupons | `/fleet-os/campaigns` | — (new) | — |
| Fleet OS — Support | `/fleet-os/support` | — (new) | — |
| Fleet OS — Refunds | `/fleet-os/refunds` | — (new) | — |
| Fleet OS — Driver Roster | `/fleet-os/roster` | — (new) | — |
| Fleet OS — Driver Compliance | `/fleet-os/compliance` | — (new) | — |
| Fleet OS — Finance / Settlement | `/fleet-os/finance` | — (new) | — |
| Fleet OS — Reports | `/fleet-os/reports` | — (new) | — |
| Fleet OS — Administration (roles, privacy/audit, system health) | `/fleet-os/admin` | — (new) | — |
| Driver App | `/driver` | — | — |
| Customer App | `/customer` | — | — |

Every `/fleet-os/*` screen shares one persistent header + a sticky **module nav strip** (`FleetOsNav`) so the whole
back office reads as one cohesive command center rather than disconnected pages. A small, deliberately
"out-of-universe" **`DemoModeSwitcher`** pill (top-right, collapsed by default) lets you jump between the Landing
page, Marketplace, Booking, Fleet OS, Driver App and Customer App, and toggle EN/繁體中文, without that chrome ever
reading as part of any one app's own navigation.

## The order-state machine (16 states)

Every order moves through one explicit, client-brief-aligned state machine, threaded consistently through the
Customer App, Driver App and Fleet OS (`src/types.ts`):

```
DRAFT → PENDING_PAYMENT → PAID → SUPPLIER_PENDING → CONFIRMED
      → DRIVER_MATCHING → ASSIGNED → DRIVER_EN_ROUTE → ARRIVED
      → PASSENGER_ONBOARD → COMPLETED

Side branches at any point prior to COMPLETED:
  CANCELLATION_REQUESTED → CANCELLED → REFUND_PENDING → REFUNDED
  PENDING_PAYMENT → FAILED   (simulated payment decline)
  SUPPLIER_PENDING → FAILED  (simulated supplier rejection)
```

| # | Status | Where it's visible |
|---|---|---|
| 1 | `DRAFT` | Order created before checkout finishes |
| 2 | `PENDING_PAYMENT` | Customer checkout, awaiting simulated payment |
| 3 | `PAID` | Payment captured (simulated) |
| 4 | `SUPPLIER_PENDING` | Awaiting the source supplier's confirmation (Klook/KKday/ezTravel/Booking.com adapters) |
| 5 | `CONFIRMED` | Supplier confirmed / booking guaranteed |
| 6 | `DRIVER_MATCHING` | Fleet OS is running the multi-channel dispatch + escalation ladder |
| 7 | `ASSIGNED` | A driver accepted; Driver App shows the trip, Fleet OS updates the queue |
| 8 | `DRIVER_EN_ROUTE` | Driver tapped "Navigate to pickup"; live position streams to Customer App + Fleet OS map |
| 9 | `ARRIVED` | Driver marked arrived; customer sees pickup PIN/instructions |
| 10 | `PASSENGER_ONBOARD` | PIN verified, trip in progress toward drop-off |
| 11 | `COMPLETED` | Trip finished; receipt, rating prompt, payout accrual |
| 12 | `CANCELLATION_REQUESTED` | Customer requested cancellation; appears in Fleet OS Refunds/Support queue |
| 13 | `CANCELLED` | Cancellation processed |
| 14 | `REFUND_PENDING` | Refund queued in Fleet OS Finance/Refunds |
| 15 | `REFUNDED` | Refund issued |
| 16 | `FAILED` | Payment declined or supplier rejected |

Every order carries a timestamped **`statusHistory`** (status, actor, timestamp, detail) appended on every
transition — rendered as a collapsible **Status Audit Timeline** on order cards in Fleet OS, and summarized in the
Customer App's Trips detail and the Driver App's job history. A global **audit log** (`auditLog` in the store) also
records cross-cutting Fleet OS actions (supplier status changes, refund approvals, role/permission edits, etc.) for
the Admin → Privacy/Audit module.

## Vehicle categories, availability, and dynamic pricing

Every booking flow (Marketplace → Booking, or Booking directly) now shows **multiple vehicle recommendations**, not
one fixed vehicle. After the customer enters pickup/destination, date/time, passenger count, luggage, flight number
(for airport trips), and any child-seat/wheelchair/pet/special-assistance requirements, the booking panel renders a
grid of cards — one per customer-facing category — computed live by `useVehicleOptions()`
(`src/components/vehicles/VehicleOptionsGrid.tsx`).

### The 10 vehicle categories

`src/data/vehicleCatalog.ts` defines a `VehicleCategoryEntry` for each category, layered on top of the five
underlying physical vehicle types (`SEDAN`/`SUV`/`VAN`/`LUXURY`/`MINIBUS`) that the rest of the simulation (seed
fleet, dispatch, Fleet OS inventory) already used — the same way a real ride-hailing platform runs several "product
types" over a smaller set of physical vehicle classes.

| Category | Example model | Max passengers | Max luggage | Notable features |
|---|---|---|---|---|
| Economy Sedan | Toyota Corolla Altis | 3 | 2 | — |
| Comfort Sedan | Toyota Camry | 3 | 2 | Large luggage |
| Premium Sedan | Toyota Camry (premium trim) | 3 | 3 | Wi-Fi, large luggage |
| SUV | Honda CR-V | 4 | 3 | Large luggage |
| 6-Seater Van | Toyota Hiace (6-seat) | 6 | 5 | Large luggage |
| 9-Seater Van | Toyota Hiace (9-seat) | 9 | 6 | Large luggage |
| Luxury / VIP Sedan | Mercedes-Benz E-Class | 3 | 3 | VIP interior, Wi-Fi, meet & greet |
| Luxury / VIP Van | Mercedes-Benz V-Class | 6 | 5 | VIP interior, Wi-Fi, meet & greet, large luggage |
| Accessible Vehicle | Toyota Hiace (wheelchair-adapted) | 4 | 3 | Wheelchair access, child seat |
| Private Charter / Minibus | Toyota Coaster | 18 | 10 | Large luggage |

Every category card shows a photo, category + example model, max passengers/luggage, child-seat/accessibility
availability, an estimated pickup time, a supplier-source badge (**Direct Fleet, Klook, KKday, ezTravel,** or
partner fleet), base price + final TWD total, a cancellation-policy summary, and a badge where earned — **Best
Value, Fastest Pickup, Most Luggage Space, VIP Comfort,** or **Recommended** (smallest vehicle that comfortably fits
the party, tie-broken by price). A category that can't safely carry the stated passengers/luggage, is missing a
required child seat/wheelchair feature, or has zero available vehicles in the pickup zone right now is shown
**visually disabled with a specific stated reason** (e.g. "This vehicle supports up to 3 passengers and 2 large
suitcases") rather than hidden or silently omitted. Customers can also select up to **3 categories to compare**
side by side in a dedicated drawer (`VehicleCompareDrawer.tsx`).

### Dynamic pricing engine

`src/lib/dynamicPricing.ts` exports `computeDynamicFareBreakdown()` — a pure function shared by the Booking panel,
the seed/ambient order generator, and the Fleet OS pricing-preview table, so every screen quotes from the exact same
logic. It combines:

- **Base ride cost** — the selected category's base fare + per-km rate × distance + per-minute rate × predicted
  duration.
- **Demand adjustment** — a Fleet-Manager-configured surcharge % per demand level (`LOW`/`NORMAL`/`HIGH`/`CRITICAL`),
  plus an extra "low availability" surcharge if fewer than the configured minimum vehicles are available in the
  pickup zone right now.
- **Weather adjustment** — a surcharge % per simulated weather state (`CLEAR`/`RAIN`/`HEAVY_RAIN`/
  `TYPHOON_WARNING`).
- **Night-service and holiday/peak-period surcharges** — configurable start/end hour and a small built-in Taiwan
  holiday/Saturday calendar.
- **Airport/zone surcharge, tolls, parking, and a waiting fee** (e.g. for a delayed flight) — each itemized
  separately, never bundled invisibly into the base fare.
- **VIP surcharge** for VIP-tagged categories.
- **Coupon and member-tier discounts**, applied after all surcharges.
- A **fairness cap**: the combined demand + weather surcharge percentage is capped at the Fleet Manager's configured
  maximum, with a `fairnessCapApplied` flag surfaced wherever that quote is shown.
- A **supplier price / platform margin** split (18% take rate, matching the Driver App's existing earnings model),
  so Fleet OS can show the customer price, the supplier/driver-facing price, and the platform's margin side by side.

Every fare comes back as a fully itemized `FareBreakdown` — base fare, distance/time cost, demand adjustment,
weather adjustment, night/holiday surcharges, airport/toll/parking/waiting fees, VIP surcharge, discount, and final
total — rendered by `FareBreakdownCard.tsx` with **nothing hidden**: the same breakdown a customer sees in Booking
is what they see later in the Customer App's Trips/Activity screens for that trip. When at least one dynamic factor
is active, the breakdown also shows a calm, translated one-line explanation (e.g. *"High-demand pricing applies
because available vehicles near Taoyuan Airport are limited during heavy rain. The final fare is always shown
before payment."*) sourced from the Fleet Manager's configurable transparency message.

The zone-condition simulation (`buildInitialZoneConditions()` / `driftZoneConditions()`) seeds Taoyuan with a live
heavy-rain + high-demand state on load specifically so this surge scenario is visible immediately without waiting —
booking a Taoyuan Airport pickup shows the demand/weather adjustment and calm explanation right away.

### Matching integration

The selected category and passenger requirements aren't cosmetic — they drive real dispatch:

1. Booking stores the selected `vehicleCategory`, the full `fareBreakdown`, and `passengerRequirements` on the
   order.
2. `lib/dispatch.ts#vehicleSatisfiesOrder()` is a hard eligibility gate: a vehicle only matches if its physical type
   matches the category's underlying type, its capacity/luggage cover the party, it has the wheelchair-access/
   child-seat feature when required, and (for VIP categories) it has a VIP interior.
3. `suggestDriver()` only ranks drivers/vehicles that pass that gate — by tier priority, then exact-category match,
   then distance — so dispatch can never offer a trip to an incompatible vehicle.
4. The Driver App's incoming-request modal and active-job card show the passenger count, luggage, service class,
   and any special requirement chips (child seat/wheelchair/pet), plus the driver's **expected earnings** (the
   fare breakdown's supplier price, not the customer total).
5. The Customer App's Trips/Activity screens show the selected category badge and an expandable full fare
   breakdown for every trip.

## Module-by-module rundown

### Marketplace (`/marketplace`) — OTA-style discovery

The direct-B2C storefront that also demonstrates the multi-channel aggregation story: search across **Direct,
Klook, KKday, ezTravel and Booking.com** inventory (`src/data/marketplaceSeed.ts`) with category filters (airport
pickup/drop-off, hourly charter, intercity transfer, attraction routes), vehicle-type/source/sort filters, source
badges on every result card, and a product-detail modal (photos-style info boxes, inclusions/exclusions, languages,
cancellation policy, capacity, duration). "Book now" deep-links into `/booking` with the listing's route/vehicle/
source pre-filled.

### Customer App (`/customer`) — premium mobile-first product

Bottom tab bar: **Home · Trips · Safety · Account**, all sharing one live store.

- **Home** (`HomeScreen.tsx`) — greeting, search-style "Book a Ride" CTA, quick-action chips (Airport Pickup/
  Drop-off/Tour Charter) that deep-link into booking, and a live-trip banner when an order is active.
- **Live Ride** (inside `ActivityScreen.tsx`, reached from Home/Trips → Active) — driver ETA/live location, pickup
  PIN, vehicle photo/type/plate, driver rating, call/chat actions, live route map, status stepper, and airport
  pickup instructions (terminal, gate, meet-and-greet board, flight number/delay). Buttons: **Track driver, contact
  driver, share trip, Safety Center, cancel/change booking** — every one updates real store state (cancellation
  request, navigation to Safety, etc.).
- **Trips** (`TripsScreen.tsx`) — Upcoming / Active / Completed / Cancelled / Refund segmented tabs. Each state has
  real actions: change pickup time, change flight number, add a note, request cancellation/refund, rate the driver,
  request invoice, "book again," and create a linked support ticket — all wired to store actions
  (`rescheduleOrder`, `addOrderNote`, `updateFlightNumber`, `requestCancellation`, `requestInvoice`,
  `createSupportTicket`).
- **Account & Loyalty** (`AccountScreen.tsx`) — saved passengers/emergency contacts (add/remove), tokenized payment
  methods (masked card display only, add/remove/set-default), coupon wallet + member tier/points, notification
  preferences (email/LINE/SMS toggles), and a Privacy Center (consent toggle, data-download request,
  delete-account request) — each backed by a real store mutation.
- **Safety** (`SafetyScreen.tsx`) — SOS button, share-trip link, emergency contact, driver/vehicle verification,
  trip PIN/order number display, and "report a concern," all clearly labelled as prototype UI (no real
  emergency-service connectivity implied).
- Checkout (`BookingPanel.tsx`) — special assistance (child seat, wheelchair, notes), payment method selection
  (card/LINE Pay/Apple Pay), invoice type (personal/company), consent checkbox, a demo "simulate payment decline"
  toggle with a retry flow, and simulated email/LINE notification + calendar-add confirmations once paid.

### Driver App (`/driver`) — serious operations app

Bottom tab bar: **Home · Earnings · Activity · Account**, dark/operational visual identity distinct from the
Customer App.

- **Home / Availability** — online/offline toggle, plus a dedicated **Availability & Preferences** card
  (`DriverAvailabilityCard.tsx`): working mode (airport priority/city priority/any), current zone, shift timer
  (auto-starts on going online), auto-accept toggle, airport preference, and live acceptance-rate readout.
- **Trip Offer & Dispatch** (`IncomingRequestModal.tsx`) — full-screen offer with countdown ring, fare estimate,
  passenger count/luggage/flight number, a simulated passenger rating, order notes, a **source badge** (which
  channel the order came from), and Accept/Decline with a **decline-reason picker** (too far, low fare, vehicle
  mismatch, off-shift, other). No response escalates through the existing multi-channel notification ladder (see
  below) and reassigns.
- **Active Trip Workflow** (`DriverPanel.tsx`) — explicit state progression Accept → Navigate to pickup → Arrived →
  Verify pickup PIN → Passenger onboard → Navigate to destination → Complete, with a live route map, an
  **Operator Support** button, and a persistent **Trip Completion** card (final amount, mock toll/parking-evidence
  upload, passenger rating prompt, digital-receipt trigger) that stays on screen until the driver dismisses it.
- **Earnings & Performance** (`EarningsScreen.tsx` + `src/lib/earnings.ts`) — Today/Week/Month/All-Time periods;
  gross earnings, incentives, tips, adjustments, cancellation deductions, platform commission, net earnings; a
  ride-type breakdown (airport transfer/city ride/charter); performance metrics (hours online, utilization,
  acceptance rate, cancellation rate, customer rating, service-quality score); and recent payout records pulled
  from Fleet OS Finance.
- **Profile & Compliance** (`AccountScreen.tsx`) — vehicle profile (plate, capacity, insurance renewal countdown), a
  **document center** (license/insurance/registration/inspection with expiry, mock OCR status, and a re-upload
  action per document), plus accordion sections for **Incident Report**, **Support Center**, and **Training
  Center**.
- **Activity** (`ActivityScreen.tsx`) — searchable trip history (by order number/location) with a per-trip "report
  an issue" action that files a real support ticket.

### Fleet OS (`/fleet-os/*`) — advanced desktop command center

- **Orders & Dispatch** (`/fleet-os`, `/fleet-os/orders`) — KPI row (active orders, unassigned queue, available
  drivers, anomalies, revenue), a filterable order queue with the full 16-state badge set, per-order multi-channel
  dispatch/escalation log and Status Audit Timeline, a live Taiwan map with animated driver markers, a notification
  feed, driver-document expiry alerts, the Analytics & Reports dashboard, and Capacity Forecast / Driver Schedule /
  Fleet Roster tabs.
- **Suppliers** (`/fleet-os/suppliers`) — supplier list (Klook/KKday/ezTravel/Booking.com/Direct-style adapters)
  with commission %, active orders, rating, avg. confirmation time, and pause/activate/suspend actions per
  supplier — modeling the supplier-adapter pattern (product/availability/pricing/booking/status/cancellation).
- **Catalog & Inventory** (`/fleet-os/catalog`) — product/route catalog with pricing and inventory controls.
- **Dynamic Pricing Service** (`/fleet-os/pricing/dynamic`) — a backend-ready module, visibly labeled **"Demo API
  simulation,"** built so a real Weather API, Maps/traffic API, fleet-GPS API, supplier-availability API, and
  pricing-rules service could replace its data source without touching any downstream consumer. Shows current
  simulated weather and demand level per Taiwan zone, available vehicles by category/zone, a live fare-preview
  table (multiplier, customer price, supplier price, platform margin, fairness-cap alert) for a selectable
  category, an active/upcoming trips table, and a **Fleet Manager configuration panel**: max dynamic price
  increase, weather/demand adjustment rules, minimum available vehicles before surge, VIP/night/holiday surcharges,
  airport & city-zone surcharges (route-specific base prices), price rounding, and the customer-facing transparency
  message — every change is approved-and-saved into a persistent audit log.
- **Fleet & Vehicle Inventory** (`/fleet-os/vehicles`) — the backend control center for vehicle categories,
  availability, and matching: the category catalogue with per-category price overrides (base fare/per-km/per-min,
  with a reset-to-default action); a real-time supply-vs-demand bar chart by Taiwan zone; an individual-vehicle
  table (plate, driver, category, service zone, status, insurance/compliance) with a detail panel to change a
  vehicle's category or service zone, toggle features (child seat, wheelchair access, VIP interior, Wi-Fi, meet &
  greet, large luggage), and **block it for maintenance** — which immediately hides it from both the customer
  booking flow and the dispatch matcher; a supplier fleet inventory summary; and an audit log for every vehicle,
  capacity, price, and availability change.
- **Campaigns & Coupons** (`/fleet-os/campaigns`) — fixed/percentage coupons, eligibility, validity windows, and
  per-user limits.
- **Support** (`/fleet-os/support`) — support tickets linked to orders (including ones customers create from Trips/
  Activity), with status tracking.
- **Refunds** (`/fleet-os/refunds`) — the queue that customer cancellation/refund requests land in, with
  approve/reject actions that drive the order back through `CANCELLATION_REQUESTED → CANCELLED → REFUND_PENDING →
  REFUNDED`.
- **Driver Roster** (`/fleet-os/roster`) — fleet breakdown by tier (owned fleet/paid member/outside contractor) and
  live unresponsive-driver flags.
- **Driver Compliance** (`/fleet-os/compliance`) — document expiry/OCR review across the whole fleet (the Fleet OS
  side of the Driver App's own document center).
- **Finance / Settlement** (`/fleet-os/finance`) — payout records surfaced in the Driver App's Earnings screen.
- **Reports** (`/fleet-os/reports`) — cross-cutting analytics/report exports.
- **Administration** (`/fleet-os/admin`) — roles/permissions, privacy/audit log, and system health.

## How the "live system" illusion works

All apps read from and write to **one Zustand store** (`src/store/useFleetStore.ts`). Because navigation uses React
Router's client-side routing (no full page reloads), the store stays alive in memory as you switch apps — so:

1. Booking a ride (Marketplace → Booking checkout, or Booking directly) pushes a new `DRAFT`/`PENDING_PAYMENT` order
   into the shared store, instantly visible in the **Fleet OS** queue.
2. Once paid, the order moves through `SUPPLIER_PENDING → CONFIRMED → DRIVER_MATCHING`, at which point dispatching a
   driver — automatically via the priority-dispatch engine (owned fleet → paid members → outside contractors) or
   manually — starts a **multi-channel notification + escalation attempt**: the **Driver App** shows a full-screen
   incoming-request modal, and Fleet OS shows a live countdown and channel badges until the driver responds (or the
   ladder escalates/times out).
3. Once a driver accepts, the order becomes `ASSIGNED` and the Driver App shows the active-trip workflow.
4. Starting the trip kicks off a simulation ticker (`useFleetStore.tick()`) that moves the vehicle along a generated
   route, one interpolated step at a time — `DRIVER_EN_ROUTE → ARRIVED → PASSENGER_ONBOARD → COMPLETED`.
5. That same position update is read by Fleet OS's live map and the Customer App's live-ride view, so the marker
   moves in both places from a single source of truth, firing simulated notifications along the way.
6. A customer cancellation/refund request (`requestCancellation`) immediately surfaces in Fleet OS's **Refunds**
   and **Support** queues; approving/rejecting it there drives the order through the remaining side-branch states.

The app seeds a large set of "already in progress" orders/drivers on load (`src/data/seed.ts`), sized so Fleet OS
shows **86 active rides** plus derived completed-ride counts for the last 3h/4h/today/week/month, and covering
Taipei, New Taipei, Taoyuan, Hsinchu, Taichung, Tainan, Kaohsiung, Hualien, Taitung, Nantou and Jiufen.

## Multi-channel driver notification + escalation ladder

When Fleet OS dispatches an order to a driver (`assignOrder` / the auto-dispatch engine), it starts a **dispatch
attempt** rather than instantly assigning them:

1. **Stage 1 — In-App Push.** The order enters `DRIVER_MATCHING`. Fleet OS's order card, the Driver App's
   full-screen incoming-request modal, and the Customer App's live-ride view all show a live countdown ring (8–15
   simulated seconds) and an `In-App Push` channel badge. The driver can tap **Accept**/**Decline** (with a reason)
   in the Driver App, or the simulation auto-accepts with some probability each tick.
2. **Escalation to Stage 2 — LINE Message + Phone Call.** If the driver doesn't respond in time, the attempt is
   marked `TIMED_OUT` and a new attempt starts, notifying via **LINE Message** and **Phone Call** simultaneously.
   Both Fleet OS's notification feed and the order's own dispatch log record this as `Escalating — No Response`.
3. **Unresponsive + reassignment.** If stage 2 also times out, the driver is flagged **unresponsive** (a red
   pulsing map marker, a red banner on the order card, an Anomalies KPI bump) and the order is requeued with a
   fresh driver suggestion and a **Reassign** button.

Every attempt — channels used, timestamps, outcome — is kept on `order.dispatchAttempts` and rendered as a
collapsible **Dispatch Log**, so the full audit trail survives even after the order resolves.

## No dead buttons

Every new interactive element added for this round of work updates real store state rather than being a static
placeholder: cancellation/refund requests move an order into `CANCELLATION_REQUESTED`/`REFUND_PENDING` and appear in
the Fleet OS Refunds/Support queues; adding/removing saved passengers, payment methods, and notification
preferences mutate the customer's profile in the store; the driver's decline-reason picker, availability card,
toll-evidence "upload," receipt trigger, and document re-upload all flip real local state (with a brief simulated
"processing" delay where that adds realism, e.g. email/LINE notification sends). Supplier pause/suspend, refund
approve/reject, and coupon/campaign toggles in Fleet OS are all wired to store actions rather than being inert rows.

## Bilingual UI: English + 繁體中文

The whole app is bilingual — every user-facing string across all apps/routes is translated into natural,
professional Traditional Chinese, using terminology consistent with the client's own blueprint (機場接送, 派車, 司機,
訂單, 即時位置, 車隊, 供應商, 行銷活動, 退款, etc.). The brand name 走瘋派車 is kept as-is in both languages.

- A lightweight custom i18n layer (`src/i18n/`, no `react-i18next` dependency) holds a flat, dot-namespaced
  `{ en: {...}, zh: {...} }` dictionary with `{varName}` interpolation. Every component calls `useLang()` directly.
- A visible `EN` / `中文` toggle sits in the `DemoModeSwitcher` menu (`data-testid="language-switcher"`) and in the
  Customer App's own Account tab. The current language is written to `localStorage` and survives page refresh and
  cross-route navigation.

## Realistic vehicle fleet & Taiwan geography

Vehicles are real-sounding make + model entries across all 10 customer-facing categories (`src/data/
vehicleCatalog.ts`: Toyota Corolla Altis, Toyota Camry, Honda CR-V, Toyota Hiace in 6-/9-seat/wheelchair-adapted
trims, Mercedes-Benz E-Class/V-Class, Toyota Coaster) with studio-style product photos generated to match the
existing photo style/aspect ratio. Location seed data
(`src/data/locations.ts`) spans Taipei, New Taipei, Taoyuan, Hsinchu, Taichung, Tainan, Kaohsiung, Hualien, Taitung,
Nantou and Jiufen, with bilingual names and real-feeling coordinates for both the Leaflet map and the SVG map
fallback.

## Dynamic, road-snapped map routes

Routes between pickup and drop-off are genuine road-following paths, not straight-line interpolation:
`src/lib/routing.ts` calls the free OSRM public demo server once per distinct pickup/drop-off pair (cached
in-memory), with a `RouteSourceBadge` (`data-source="OSRM"|"SYNTHETIC"`) showing which path source is active, and an
automatic fallback to a synthetic Catmull-Rom curve generator (`src/lib/geo.ts`) if the routing service is
unreachable — the demo never breaks even fully offline.

## Tech stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** — glass/depth surfaces and a map-led visual language for the Customer/Driver apps, an advanced
  dark "mission control" theme for Fleet OS
- **Zustand** for the single shared client-side store + simulation engine
- **Framer Motion** for panel transitions, animated counters, status badges, and toast notifications
- **`recharts`** for Fleet OS Analytics/Reports and the Driver App's Earnings screen
- **@react-three/fiber + @react-three/drei (three.js)** for the 3D hero vehicle on the landing page
- **react-leaflet + OpenStreetMap tiles**, with an automatic offline-safe fallback to a stylized SVG/canvas map
- **OSRM public demo server** for real, road-snapped route geometry, with a synthetic fallback
- **`qrcode.react`** for client-side QR-code e-voucher generation
- A lightweight custom **i18n context** (`src/i18n/`) for the English / 繁體中文 bilingual UI

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`). Start at the landing page to see every app,
or use the collapsible `DemoModeSwitcher` pill (top-right) to jump directly between them.

```bash
npm run build      # production build
npm run lint       # oxlint
```

## Automated end-to-end tests

Playwright scripts live in `e2e/` (make sure `npm run dev` is running first, then in another terminal):

```bash
npm run test:e2e:smoke            # visits every app/route (incl. every /fleet-os/* module), fails on any console/page error
npm run test:e2e:lifecycle        # books a real order and drives it through the full 16-state lifecycle across all apps
npm run test:e2e:vehicle-pricing  # multi-vehicle-card selection, ineligibility, compare-3, dynamic pricing, both new Fleet OS modules, matching integration
```

`test:e2e:lifecycle` is the best single proof that the "connected system" illusion works: it creates a booking,
waits for a real driver to accept the dispatch (working through the multi-channel escalation ladder if needed),
starts the trip in the Driver App, and confirms the same live position + status is mirrored in the Customer App
until the order reaches `COMPLETED`. It navigates between apps exclusively through the `DemoModeSwitcher` (never
`page.goto`), so the shared store state survives every "hop" — exactly like a real user switching between apps
would need the underlying data to stay in sync.

`test:e2e:vehicle-pricing` proves the vehicle-selection + dynamic-pricing feature area end to end: it confirms the
booking grid renders all 10 categories, bumps passengers to 9 to show a category becoming ineligible with a stated
reason, compares up to 3 eligible categories, confirms the fare breakdown reflects Taoyuan's seeded heavy-rain/
high-demand pricing factor, switches to a zone with the fleet's one wheelchair-accessible vehicle and enables the
wheelchair requirement (confirming every other category becomes ineligible), submits that booking, edits a Fleet
Manager pricing rule in `/fleet-os/pricing/dynamic` and confirms it lands in the audit log, blocks/unblocks a
vehicle for maintenance in `/fleet-os/vehicles` and confirms its audit log, and finally confirms the
wheelchair-accessible order is matched by the dispatch engine to a real driver whose Driver App job card shows the
wheelchair requirement — the full matching-integration proof.

There are also several demo/recording helper scripts (not part of CI, but handy for re-generating walkthrough
artifacts or exploring a flow yourself). Unless noted "headless", these open a **real, visible** browser window:

```bash
npm run demo:escalation      # books a ride, forces "driver won't respond", plays out the full escalation ladder
npm run demo:features        # tours Fleet OS, accepts a live request in the Driver App, then customer history
npm run demo:screenshots     # headless — captures PNGs of key UI surfaces into /opt/cursor/artifacts
npm run demo:redesign-tour   # headless — captures PNGs + short screen-recording videos into /opt/cursor/artifacts
node e2e/demo-i18n-vehicles.mjs [port]           # toggles EN <-> 中文 across apps, confirms localStorage persistence
node e2e/demo-booking-ota.mjs [port]              # OSRM live-route badge, fare breakdown, coupon, QR voucher, audit timeline
node e2e/demo-new-feature-screenshots.mjs [port]  # headless — captures PNGs of new UI into /opt/cursor/artifacts
```

## What's simulated vs. what would be real integrations

Nothing here talks to a real backend — everything is simulated client-side, with a note on what a production build
would need.

| Area | In this prototype | In production |
|---|---|---|
| Cross-platform order aggregation | Simulated channel picker + ambient orders from Klook/KKday/ezTravel/Booking.com/LINE OA/Website/Phone | Real webhook/API integrations per channel into a central orders table |
| Supplier adapters | Fleet OS Suppliers module with pause/activate/suspend + a single generic adapter shape (product/availability/pricing/booking/status/cancellation) | One real adapter implementation per supplier's actual API |
| Payments | Simulated success/decline/retry in checkout, `PENDING_PAYMENT`/`PAID`/`FAILED` states | Real PSP integration (idempotent payment intents) |
| Driver dispatch | Priority simulation (owned fleet → paid members → outside contractors) + multi-channel escalation ladder | Same priority logic against real driver presence/location |
| Live location | Simulated animated markers along OSRM-resolved (or synthetic-fallback) routes, clearly demo data | Real GPS streaming from driver devices |
| Notifications | Simulated in-app/LINE/phone-call/email channel badges and toasts | Real LINE Messaging API, push (FCM/APNs), telephony (e.g. Twilio) |
| Vouchers / invoices | Client-side QR code + printable trip-sheet; invoice type selection at checkout | Real e-invoice issuance, PDF generation service |
| Refunds / support | Store-backed queues in Fleet OS, driven by customer-initiated requests | Real payment-gateway refund calls + ticketing system |
| Roles / permissions / 2FA | Represented as a Fleet OS Admin module UI | Real RBAC + enforced 2FA for admin accounts |
| Privacy / audit | `statusHistory` + a global `auditLog`, plus a customer Privacy Center (consent, data download/delete requests) | Real data-retention pipeline honoring those requests |
| Weather / demand feed | Simulated per-zone state that drifts over time (`lib/dynamicPricing.ts`), clearly labeled "Demo API simulation" in `/fleet-os/pricing/dynamic` | Real Weather API + a real demand/telemetry pipeline behind the same `ZoneCondition` shape |
| Dynamic pricing rules | Fleet-Manager-editable rules stored in the client-side store, applied identically everywhere a fare is quoted | A real pricing-rules service with approval workflow, versioning, and rollout controls |
| Fleet/vehicle GPS & supplier availability | Simulated vehicle records + driver status in the store | Real fleet-GPS telemetry and supplier-availability API integrations feeding the same inventory shape |

## Deliberately simplified or deferred

Given the scope of this round (8 new/restructured routes and dozens of screens), a few items were judgment-scoped:

- Marketplace product detail shows structured inclusions/exclusions/cancellation/rating info rather than a full
  photo gallery + review-thread UI — kept to the data the client brief actually calls out (photos, rules, rating,
  cancellation terms, route map) without building a separate reviews subsystem.
- Login/OTP/password-reset are represented as account-security concepts in the Account screen's copy rather than a
  full separate auth flow, since there is no real backend/session to authenticate against in this prototype.
- 2FA-for-admins and full RBAC enforcement are represented as Fleet OS Admin UI (roles, permissions list) rather
  than actually gating any route — there's no real login session in this client-only prototype to gate.
- Emergency/temporary dispatch conflict-resolution UI is noted on the landing page's roadmap rather than fully
  modeled, consistent with the original Phase 2 scope notes.
- The seed fleet (24 vehicles across 10 categories × 10 zones) intentionally has thin per-zone/per-category
  availability in places — e.g. the whole fleet has exactly one wheelchair-accessible vehicle. This is realistic
  ("we don't have an accessible car in this zone right now" is itself a valid demo state, and is exactly what
  drives the "no availability" ineligibility reason), but it does mean a specific category may show 0 available
  vehicles in a specific zone at a given moment in the live simulation — pick a different pickup zone or refresh
  the quote to see another category's live availability.
- Route-specific per-pair base prices are represented via a per-zone airport/city surcharge (Fleet Manager
  configurable) rather than a full pairwise route-price matrix across all ~30 seeded locations, to keep the
  Fleet Manager configuration UI reviewable rather than an unwieldy grid.
- Corporate-rate pricing is represented by the existing member-tier discount mechanism rather than a separate
  corporate-account subsystem (no B2B account management exists in this prototype).

Phase 3 (in-app payments beyond the simulated flow, native driver/customer app-store releases) remains intentionally
out of scope for this prototype — the landing page includes a small "coming soon" roadmap nod for it.
