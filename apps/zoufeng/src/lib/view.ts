import type { Category, Route, Vehicle } from "@/db/schema";
import type { WidgetCategory, WidgetRoute } from "@/components/site/BookingWidget";
import type { FleetVehicle } from "@/components/site/FleetSection";
import { money } from "./format";
import { pick, type Lang } from "./i18n";

export function widgetCategories(cats: Category[], lang: Lang): WidgetCategory[] {
  return cats
    .filter((c) => c.showInBooking)
    .map((c) => ({ id: c.id, slug: c.slug, name: pick(c, "name", lang), short: pick(c, "short", lang), icon: c.icon, color: c.color, pricingMode: c.pricingMode }));
}

export function widgetRoutes(routes: Route[], cats: Category[], lang: Lang): WidgetRoute[] {
  return routes
    .slice()
    .sort((a, b) => Number(b.quickLink) - Number(a.quickLink) || a.sortOrder - b.sortOrder)
    .map((r) => ({ id: r.id, from: pick(r, "from", lang), to: pick(r, "to", lang), categorySlug: cats.find((c) => c.id === r.categoryId)?.slug ?? null }));
}

export function fleetVehicles(vs: Vehicle[], lang: Lang, currency: string): FleetVehicle[] {
  return vs.map((v) => ({
    id: v.id,
    typeId: v.typeId,
    name: pick(v, "name", lang),
    model: v.model,
    image: v.image,
    minPax: v.minPassengers,
    maxPax: v.maxPassengers,
    luggage: v.luggage,
    price: money(v.basePrice, currency),
  }));
}
