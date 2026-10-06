CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`customer_id` integer,
	`category_id` integer,
	`subcategory_id` integer,
	`vehicle_id` integer,
	`driver_id` integer,
	`route_id` integer,
	`pickup` text NOT NULL,
	`dropoff` text DEFAULT '' NOT NULL,
	`pickup_at` text NOT NULL,
	`passengers` integer DEFAULT 1 NOT NULL,
	`luggage` integer DEFAULT 0 NOT NULL,
	`hours` integer DEFAULT 0 NOT NULL,
	`days` integer DEFAULT 0 NOT NULL,
	`distance_km` real DEFAULT 0 NOT NULL,
	`duration_min` integer DEFAULT 0 NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`promo_code` text DEFAULT '' NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`flight_no` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rating` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_code_unique` ON `bookings` (`code`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`short_zh` text DEFAULT '' NOT NULL,
	`short_en` text DEFAULT '' NOT NULL,
	`subtitle_zh` text DEFAULT '' NOT NULL,
	`subtitle_en` text DEFAULT '' NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT 'Car' NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`pricing_mode` text DEFAULT 'distance' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_in_booking` integer DEFAULT true NOT NULL,
	`show_on_home` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`password_hash` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`license_no` text DEFAULT '' NOT NULL,
	`vehicle_id` integer,
	`plate_number` text DEFAULT '' NOT NULL,
	`languages` text DEFAULT '中文' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`rating` real DEFAULT 5 NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_zh` text DEFAULT '一般' NOT NULL,
	`group_en` text DEFAULT 'General' NOT NULL,
	`question_zh` text NOT NULL,
	`question_en` text NOT NULL,
	`answer_zh` text NOT NULL,
	`answer_en` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nav_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label_zh` text NOT NULL,
	`label_en` text NOT NULL,
	`href` text NOT NULL,
	`icon` text DEFAULT 'Circle' NOT NULL,
	`location` text DEFAULT 'sidebar' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`new_tab` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title_zh` text NOT NULL,
	`title_en` text NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`discount_type` text DEFAULT 'percent' NOT NULL,
	`discount_value` real DEFAULT 10 NOT NULL,
	`min_amount` integer DEFAULT 0 NOT NULL,
	`usage_limit` integer DEFAULT 0 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`starts_at` text DEFAULT '' NOT NULL,
	`ends_at` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_code_unique` ON `promotions` (`code`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`rating` integer DEFAULT 5 NOT NULL,
	`content` text NOT NULL,
	`trip` text DEFAULT '' NOT NULL,
	`approved` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_zh` text NOT NULL,
	`from_en` text NOT NULL,
	`to_zh` text NOT NULL,
	`to_en` text NOT NULL,
	`category_id` integer,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`distance_km` real DEFAULT 30 NOT NULL,
	`price` integer DEFAULT 1000 NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`popular` integer DEFAULT true NOT NULL,
	`quick_link` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`price_multiplier` real DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vehicle_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_types_slug_unique` ON `vehicle_types` (`slug`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`min_passengers` integer DEFAULT 1 NOT NULL,
	`max_passengers` integer DEFAULT 4 NOT NULL,
	`luggage` integer DEFAULT 2 NOT NULL,
	`base_price` integer DEFAULT 1000 NOT NULL,
	`per_km` integer DEFAULT 25 NOT NULL,
	`per_hour` integer DEFAULT 600 NOT NULL,
	`per_day` integer DEFAULT 3000 NOT NULL,
	`features_zh` text DEFAULT '' NOT NULL,
	`features_en` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `vehicle_types`(`id`) ON UPDATE no action ON DELETE set null
);
