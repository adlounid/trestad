import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  personalNumberEncrypted: text("personal_number_encrypted").notNull(),
  personalNumberLastFour: text("personal_number_last_four").notNull(),
  squareMeters: integer("square_meters").notNull(),
  distanceKilometers: integer("distance_kilometers").notNull(),
  laborCost: integer("labor_cost").notNull(),
  travelFee: integer("travel_fee").notNull(),
  rutDeduction: integer("rut_deduction").notNull(),
  customerTotal: integer("customer_total").notNull(),
  rutEnabled: integer("rut_enabled", { mode: "boolean" }).notNull(),
  requestedDate: text("requested_date").notNull(),
  notes: text("notes").notNull(),
  status: text("status", { enum: ["new", "confirmed", "completed", "paid", "exported", "cancelled"] }).notNull(),
  invoiceNumber: text("invoice_number"),
  paymentDate: text("payment_date"),
  workedHours: integer("worked_hours"),
  materialCost: integer("material_cost").notNull().default(0),
}, (table) => [
  index("bookings_status_idx").on(table.status),
  index("bookings_payment_date_idx").on(table.paymentDate),
]);

export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  expirationTime: integer("expiration_time"),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("push_subscriptions_admin_email_idx").on(table.adminEmail),
]);
