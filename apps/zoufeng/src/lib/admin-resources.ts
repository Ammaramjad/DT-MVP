export type FieldType = "text" | "textarea" | "number" | "float" | "bool" | "select" | "relation" | "image" | "icon" | "color" | "date" | "password" | "email";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  relation?: ResourceKey;
  default?: string | number | boolean;
  half?: boolean;
  help?: string;
}

export interface Resource {
  key: ResourceKey;
  title: string;
  titleZh: string;
  icon: string;
  fields: Field[];
  columns: string[];
  search: string[];
  sort: { field: string; dir: "asc" | "desc" };
  readOnly?: boolean;
  noCreate?: boolean;
  labelField: string;
}

export type ResourceKey =
  | "navigation"
  | "categories"
  | "subcategories"
  | "vehicle-types"
  | "vehicles"
  | "routes"
  | "drivers"
  | "customers"
  | "promotions"
  | "reviews"
  | "faqs"
  | "messages"
  | "admins";

const sort = { name: "sortOrder", label: "Sort order", type: "number", default: 0, half: true } as const;
const active = { name: "active", label: "Active", type: "bool", default: true, half: true } as const;
const bi = (name: string, label: string, type: FieldType = "text", required = true): Field[] => [
  { name: `${name}Zh`, label: `${label} (中文)`, type, required, half: type !== "textarea" },
  { name: `${name}En`, label: `${label} (English)`, type, required, half: type !== "textarea" },
];

export const RESOURCES: Record<ResourceKey, Resource> = {
  navigation: {
    key: "navigation",
    title: "Navigation",
    titleZh: "導覽選單",
    icon: "Navigation",
    labelField: "labelZh",
    fields: [
      ...bi("label", "Label"),
      { name: "href", label: "Link (URL or path)", type: "text", required: true, half: true },
      { name: "icon", label: "Icon", type: "icon", default: "Circle", half: true },
      { name: "location", label: "Location", type: "select", default: "sidebar", half: true, options: [{ value: "sidebar", label: "Sidebar (main)" }, { value: "footer", label: "Sidebar (bottom) / footer" }] },
      sort,
      { name: "visible", label: "Visible", type: "bool", default: true, half: true },
      { name: "newTab", label: "Open in new tab", type: "bool", default: false, half: true },
    ],
    columns: ["icon", "labelZh", "labelEn", "href", "location", "sortOrder", "visible"],
    search: ["labelZh", "labelEn", "href"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  categories: {
    key: "categories",
    title: "Categories",
    titleZh: "服務分類",
    icon: "LayoutGrid",
    labelField: "nameZh",
    fields: [
      { name: "slug", label: "Slug (URL key)", type: "text", required: true, half: true },
      { name: "pricingMode", label: "Pricing mode", type: "select", default: "distance", half: true, options: [{ value: "distance", label: "Distance / route" }, { value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }] },
      ...bi("name", "Name"),
      ...bi("short", "Short tag", "text", false),
      ...bi("subtitle", "Subtitle", "text", false),
      ...bi("description", "Description", "textarea", false),
      { name: "icon", label: "Icon", type: "icon", default: "Car", half: true },
      { name: "color", label: "Color", type: "color", default: "#3b82f6", half: true },
      { name: "image", label: "Image", type: "image" },
      sort,
      { name: "showInBooking", label: "Show as booking tab", type: "bool", default: true, half: true },
      { name: "showOnHome", label: "Show on homepage", type: "bool", default: true, half: true },
      active,
    ],
    columns: ["image", "icon", "nameZh", "nameEn", "slug", "pricingMode", "sortOrder", "active"],
    search: ["nameZh", "nameEn", "slug"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  subcategories: {
    key: "subcategories",
    title: "Subcategories",
    titleZh: "子分類",
    icon: "Tag",
    labelField: "nameZh",
    fields: [
      { name: "categoryId", label: "Parent category", type: "relation", relation: "categories", required: true, half: true },
      { name: "slug", label: "Slug", type: "text", required: true, half: true },
      ...bi("name", "Name"),
      ...bi("description", "Description", "textarea", false),
      { name: "image", label: "Image", type: "image" },
      { name: "priceMultiplier", label: "Price multiplier", type: "float", default: 1, half: true, help: "1 = normal price, 1.5 = +50%, 0.9 = -10%" },
      sort,
      active,
    ],
    columns: ["image", "categoryId", "nameZh", "nameEn", "slug", "priceMultiplier", "sortOrder", "active"],
    search: ["nameZh", "nameEn", "slug"],
    sort: { field: "categoryId", dir: "asc" },
  },
  "vehicle-types": {
    key: "vehicle-types",
    title: "Vehicle types",
    titleZh: "車型分類",
    icon: "CarFront",
    labelField: "nameZh",
    fields: [{ name: "slug", label: "Slug", type: "text", required: true }, ...bi("name", "Name"), sort, active],
    columns: ["nameZh", "nameEn", "slug", "sortOrder", "active"],
    search: ["nameZh", "nameEn", "slug"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  vehicles: {
    key: "vehicles",
    title: "Vehicles",
    titleZh: "車輛",
    icon: "Car",
    labelField: "nameZh",
    fields: [
      { name: "typeId", label: "Vehicle type", type: "relation", relation: "vehicle-types", half: true },
      { name: "model", label: "Model", type: "text", half: true },
      ...bi("name", "Name"),
      { name: "image", label: "Image (transparent PNG works best)", type: "image" },
      { name: "minPassengers", label: "Min passengers", type: "number", default: 1, half: true },
      { name: "maxPassengers", label: "Max passengers", type: "number", default: 4, half: true },
      { name: "luggage", label: "Luggage capacity", type: "number", default: 2, half: true },
      { name: "basePrice", label: "Base price", type: "number", default: 1000, half: true },
      { name: "perKm", label: "Price per km", type: "number", default: 25, half: true },
      { name: "perHour", label: "Price per hour", type: "number", default: 600, half: true },
      { name: "perDay", label: "Price per day", type: "number", default: 3000, half: true },
      sort,
      ...bi("features", "Features (comma separated)", "text", false),
      { name: "featured", label: "Featured on homepage", type: "bool", default: true, half: true },
      active,
    ],
    columns: ["image", "nameZh", "typeId", "model", "maxPassengers", "basePrice", "featured", "active"],
    search: ["nameZh", "nameEn", "model"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  routes: {
    key: "routes",
    title: "Routes",
    titleZh: "熱門路線",
    icon: "Route",
    labelField: "toZh",
    fields: [
      ...bi("from", "From"),
      ...bi("to", "To"),
      { name: "categoryId", label: "Category", type: "relation", relation: "categories", half: true },
      { name: "price", label: "Price (from)", type: "number", default: 1000, half: true },
      { name: "durationMin", label: "Duration (minutes)", type: "number", default: 60, half: true },
      { name: "distanceKm", label: "Distance (km)", type: "float", default: 30, half: true },
      { name: "image", label: "Image", type: "image" },
      ...bi("description", "Description", "textarea", false),
      sort,
      { name: "popular", label: "Show in popular routes", type: "bool", default: true, half: true },
      { name: "quickLink", label: "Show as quick link in search", type: "bool", default: false, half: true },
      active,
    ],
    columns: ["image", "fromZh", "toZh", "categoryId", "price", "durationMin", "popular", "active"],
    search: ["fromZh", "fromEn", "toZh", "toEn"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  drivers: {
    key: "drivers",
    title: "Drivers",
    titleZh: "司機",
    icon: "UserRound",
    labelField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "phone", label: "Phone", type: "text", half: true },
      { name: "licenseNo", label: "License no.", type: "text", half: true },
      { name: "plateNumber", label: "Plate number", type: "text", half: true },
      { name: "vehicleId", label: "Vehicle", type: "relation", relation: "vehicles", half: true },
      { name: "status", label: "Status", type: "select", default: "available", half: true, options: [{ value: "available", label: "Available" }, { value: "on_trip", label: "On trip" }, { value: "off_duty", label: "Off duty" }] },
      { name: "languages", label: "Languages", type: "text", default: "中文", half: true },
      { name: "rating", label: "Rating", type: "float", default: 5, half: true },
      { name: "avatar", label: "Photo", type: "image" },
      active,
    ],
    columns: ["avatar", "name", "phone", "plateNumber", "vehicleId", "status", "rating", "active"],
    search: ["name", "phone", "plateNumber", "licenseNo"],
    sort: { field: "id", dir: "asc" },
  },
  customers: {
    key: "customers",
    title: "Customers",
    titleZh: "會員",
    icon: "Users",
    labelField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "email", label: "Email", type: "email", required: true, half: true },
      { name: "phone", label: "Phone", type: "text", half: true },
      { name: "password", label: "New password (leave blank to keep)", type: "password", half: true },
      active,
    ],
    columns: ["name", "email", "phone", "createdAt", "active"],
    search: ["name", "email", "phone"],
    sort: { field: "id", dir: "desc" },
  },
  promotions: {
    key: "promotions",
    title: "Promotions",
    titleZh: "優惠活動",
    icon: "TicketPercent",
    labelField: "code",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, half: true },
      { name: "discountType", label: "Discount type", type: "select", default: "percent", half: true, options: [{ value: "percent", label: "Percent %" }, { value: "fixed", label: "Fixed amount" }] },
      ...bi("title", "Title"),
      ...bi("description", "Description", "textarea", false),
      { name: "discountValue", label: "Discount value", type: "float", default: 10, half: true },
      { name: "minAmount", label: "Minimum spend", type: "number", default: 0, half: true },
      { name: "usageLimit", label: "Usage limit (0 = unlimited)", type: "number", default: 0, half: true },
      { name: "usedCount", label: "Used count", type: "number", default: 0, half: true },
      { name: "startsAt", label: "Starts", type: "date", half: true },
      { name: "endsAt", label: "Ends", type: "date", half: true },
      { name: "image", label: "Image", type: "image" },
      active,
    ],
    columns: ["image", "code", "titleZh", "discountType", "discountValue", "usedCount", "endsAt", "active"],
    search: ["code", "titleZh", "titleEn"],
    sort: { field: "id", dir: "desc" },
  },
  reviews: {
    key: "reviews",
    title: "Reviews",
    titleZh: "評價",
    icon: "Star",
    labelField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "rating", label: "Rating (1-5)", type: "number", default: 5, half: true },
      { name: "trip", label: "Trip", type: "text" },
      { name: "content", label: "Content", type: "textarea", required: true },
      { name: "avatar", label: "Avatar", type: "image" },
      { name: "approved", label: "Approved (visible on site)", type: "bool", default: false, half: true },
    ],
    columns: ["name", "rating", "content", "trip", "createdAt", "approved"],
    search: ["name", "content", "trip"],
    sort: { field: "id", dir: "desc" },
  },
  faqs: {
    key: "faqs",
    title: "FAQ",
    titleZh: "常見問題",
    icon: "CircleHelp",
    labelField: "questionZh",
    fields: [...bi("group", "Group"), ...bi("question", "Question", "textarea"), ...bi("answer", "Answer", "textarea"), sort, active],
    columns: ["groupZh", "questionZh", "questionEn", "sortOrder", "active"],
    search: ["questionZh", "questionEn", "answerZh", "answerEn"],
    sort: { field: "sortOrder", dir: "asc" },
  },
  messages: {
    key: "messages",
    title: "Messages",
    titleZh: "客服訊息",
    icon: "Mail",
    labelField: "subject",
    noCreate: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "email", label: "Email", type: "email", required: true, half: true },
      { name: "phone", label: "Phone", type: "text", half: true },
      { name: "status", label: "Status", type: "select", default: "new", half: true, options: ["new", "read", "replied", "closed"].map((v) => ({ value: v, label: v })) },
      { name: "subject", label: "Subject", type: "text" },
      { name: "body", label: "Message", type: "textarea", required: true },
    ],
    columns: ["status", "name", "email", "subject", "body", "createdAt"],
    search: ["name", "email", "subject", "body"],
    sort: { field: "id", dir: "desc" },
  },
  admins: {
    key: "admins",
    title: "Admin users",
    titleZh: "管理員",
    icon: "ShieldCheck",
    labelField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "email", label: "Email", type: "email", required: true, half: true },
      { name: "role", label: "Role", type: "select", default: "admin", half: true, options: [{ value: "admin", label: "Admin" }, { value: "staff", label: "Staff" }] },
      { name: "password", label: "Password (required for new, blank keeps current)", type: "password", half: true },
    ],
    columns: ["name", "email", "role", "createdAt"],
    search: ["name", "email"],
    sort: { field: "id", dir: "asc" },
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
export function isResource(k: string): k is ResourceKey {
  return k in RESOURCES;
}
