import { sql } from "drizzle-orm";
import { blob, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const bool = (name: string, def = true) => integer(name, { mode: "boolean" }).notNull().default(def);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const admins = sqliteTable("admins", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: createdAt(),
});

export const media = sqliteTable("media", {
  id: id(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: createdAt(),
});

export const navItems = sqliteTable("nav_items", {
  id: id(),
  labelZh: text("label_zh").notNull(),
  labelEn: text("label_en").notNull(),
  href: text("href").notNull(),
  icon: text("icon").notNull().default("Circle"),
  location: text("location").notNull().default("sidebar"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: bool("visible"),
  newTab: bool("new_tab", false),
});

export const categories = sqliteTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  shortZh: text("short_zh").notNull().default(""),
  shortEn: text("short_en").notNull().default(""),
  subtitleZh: text("subtitle_zh").notNull().default(""),
  subtitleEn: text("subtitle_en").notNull().default(""),
  descriptionZh: text("description_zh").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  icon: text("icon").notNull().default("Car"),
  color: text("color").notNull().default("#3b82f6"),
  image: text("image").notNull().default(""),
  pricingMode: text("pricing_mode").notNull().default("distance"),
  sortOrder: integer("sort_order").notNull().default(0),
  showInBooking: bool("show_in_booking"),
  showOnHome: bool("show_on_home"),
  active: bool("active"),
});

export const subcategories = sqliteTable("subcategories", {
  id: id(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionZh: text("description_zh").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  image: text("image").notNull().default(""),
  priceMultiplier: real("price_multiplier").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  active: bool("active"),
});

export const vehicleTypes = sqliteTable("vehicle_types", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: bool("active"),
});

export const vehicles = sqliteTable("vehicles", {
  id: id(),
  typeId: integer("type_id").references(() => vehicleTypes.id, { onDelete: "set null" }),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  model: text("model").notNull().default(""),
  image: text("image").notNull().default(""),
  minPassengers: integer("min_passengers").notNull().default(1),
  maxPassengers: integer("max_passengers").notNull().default(4),
  luggage: integer("luggage").notNull().default(2),
  basePrice: integer("base_price").notNull().default(1000),
  perKm: integer("per_km").notNull().default(25),
  perHour: integer("per_hour").notNull().default(600),
  perDay: integer("per_day").notNull().default(3000),
  featuresZh: text("features_zh").notNull().default(""),
  featuresEn: text("features_en").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  featured: bool("featured"),
  active: bool("active"),
});

export const routes = sqliteTable("routes", {
  id: id(),
  fromZh: text("from_zh").notNull(),
  fromEn: text("from_en").notNull(),
  toZh: text("to_zh").notNull(),
  toEn: text("to_en").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  durationMin: integer("duration_min").notNull().default(60),
  distanceKm: real("distance_km").notNull().default(30),
  price: integer("price").notNull().default(1000),
  image: text("image").notNull().default(""),
  descriptionZh: text("description_zh").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  popular: bool("popular"),
  quickLink: bool("quick_link", false),
  active: bool("active"),
});

export const drivers = sqliteTable("drivers", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  licenseNo: text("license_no").notNull().default(""),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  plateNumber: text("plate_number").notNull().default(""),
  languages: text("languages").notNull().default("中文"),
  avatar: text("avatar").notNull().default(""),
  rating: real("rating").notNull().default(5),
  status: text("status").notNull().default("available"),
  active: bool("active"),
  createdAt: createdAt(),
});

export const customers = sqliteTable("customers", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull().default(""),
  active: bool("active"),
  createdAt: createdAt(),
});

export const promotions = sqliteTable("promotions", {
  id: id(),
  code: text("code").notNull().unique(),
  titleZh: text("title_zh").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionZh: text("description_zh").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  image: text("image").notNull().default(""),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: real("discount_value").notNull().default(10),
  minAmount: integer("min_amount").notNull().default(0),
  usageLimit: integer("usage_limit").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: text("starts_at").notNull().default(""),
  endsAt: text("ends_at").notNull().default(""),
  active: bool("active"),
});

export const bookings = sqliteTable("bookings", {
  id: id(),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  subcategoryId: integer("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  driverId: integer("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  routeId: integer("route_id").references(() => routes.id, { onDelete: "set null" }),
  pickup: text("pickup").notNull(),
  dropoff: text("dropoff").notNull().default(""),
  pickupAt: text("pickup_at").notNull(),
  passengers: integer("passengers").notNull().default(1),
  luggage: integer("luggage").notNull().default(0),
  hours: integer("hours").notNull().default(0),
  days: integer("days").notNull().default(0),
  distanceKm: real("distance_km").notNull().default(0),
  durationMin: integer("duration_min").notNull().default(0),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  promoCode: text("promo_code").notNull().default(""),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull().default(""),
  flightNo: text("flight_no").notNull().default(""),
  notes: text("notes").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  status: text("status").notNull().default("pending"),
  rating: integer("rating"),
  createdAt: createdAt(),
});

export const reviews = sqliteTable("reviews", {
  id: id(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  content: text("content").notNull(),
  trip: text("trip").notNull().default(""),
  approved: bool("approved"),
  createdAt: createdAt(),
});

export const faqs = sqliteTable("faqs", {
  id: id(),
  groupZh: text("group_zh").notNull().default("一般"),
  groupEn: text("group_en").notNull().default("General"),
  questionZh: text("question_zh").notNull(),
  questionEn: text("question_en").notNull(),
  answerZh: text("answer_zh").notNull(),
  answerEn: text("answer_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: bool("active"),
});

export const messages = sqliteTable("messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: createdAt(),
});

export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleType = typeof vehicleTypes.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type NavItem = typeof navItems.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
