import { schema as s } from "@/db";
import type { ResourceKey } from "./admin-resources";

export const TABLES = {
  navigation: s.navItems,
  categories: s.categories,
  subcategories: s.subcategories,
  "vehicle-types": s.vehicleTypes,
  vehicles: s.vehicles,
  routes: s.routes,
  drivers: s.drivers,
  customers: s.customers,
  promotions: s.promotions,
  reviews: s.reviews,
  faqs: s.faqs,
  messages: s.messages,
  admins: s.admins,
} satisfies Record<ResourceKey, unknown>;
