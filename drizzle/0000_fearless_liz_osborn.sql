CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`postal_code` text NOT NULL,
	`city` text NOT NULL,
	`personal_number_encrypted` text NOT NULL,
	`personal_number_last_four` text NOT NULL,
	`square_meters` integer NOT NULL,
	`distance_kilometers` integer NOT NULL,
	`labor_cost` integer NOT NULL,
	`travel_fee` integer NOT NULL,
	`rut_deduction` integer NOT NULL,
	`customer_total` integer NOT NULL,
	`rut_enabled` integer NOT NULL,
	`requested_date` text NOT NULL,
	`notes` text NOT NULL,
	`status` text NOT NULL,
	`invoice_number` text,
	`payment_date` text,
	`worked_hours` integer,
	`material_cost` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `bookings_payment_date_idx` ON `bookings` (`payment_date`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`expiration_time` integer,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_admin_email_idx` ON `push_subscriptions` (`admin_email`);