# ZOUFENG 走瘋移動 — Taiwan mobility platform

Full-stack Next.js 15 app (public booking site + admin panel) styled with neumorphism, skeuomorphism and glassmorphism.

## Run locally

```bash
cd apps/zoufeng
npm install
npm run dev        # http://localhost:3100
```

The SQLite database (`data/zoufeng.db`) is created, migrated and seeded automatically on the first request.
`npm run db:reset` deletes it so it is re-seeded.

- Website: http://localhost:3100
- Admin: http://localhost:3100/admin — dev seed login `admin@zoufeng.tw` / `admin12345` (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first boot)
- Demo customer: `demo@zoufeng.tw` / `password123`

## What the admin controls

Everything shown on the website comes from the database and is editable in `/admin`:
navigation (sidebar + footer), categories (booking tabs, pricing mode), subcategories (price multipliers),
vehicle types, vehicles, routes, drivers, customers, promotions, reviews (approve/feature), FAQ, contact messages,
admin users, media library (image uploads), and site settings (hero texts/images, feature pills, weather city,
stats, app links, sidebar promo, contact info, pricing rules).

Dashboard: KPIs, rides per day, revenue by month, rides by category, status breakdown, peak hours,
vehicle usage, top routes, recent bookings. Bookings: filter/search, status workflow, driver & vehicle assignment,
payment status, price adjustment, CSV export.

## Deploy (Vercel)

Set the project root to `apps/zoufeng` and configure:

| Variable | |
|---|---|
| `AUTH_SECRET` | **Required.** Long random string for signing session cookies |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Turso/libSQL database (strongly recommended — without it Vercel uses an ephemeral `/tmp` SQLite file) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial admin account. `ADMIN_PASSWORD` is **required** in production for the first boot (no default password, no demo customer) |

## Scripts

`npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:generate` (after editing `src/db/schema.ts`)
