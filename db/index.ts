import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let databaseInitialized = false;
let pushSubscriptionsInitialized = false;

const bookingsTableSql = `
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    personal_number_encrypted TEXT NOT NULL,
    personal_number_last_four TEXT NOT NULL,
    square_meters INTEGER NOT NULL,
    distance_kilometers INTEGER NOT NULL,
    labor_cost INTEGER NOT NULL,
    travel_fee INTEGER NOT NULL,
    rut_deduction INTEGER NOT NULL,
    customer_total INTEGER NOT NULL,
    rut_enabled INTEGER NOT NULL,
    requested_date TEXT NOT NULL,
    notes TEXT NOT NULL,
    status TEXT NOT NULL,
    invoice_number TEXT,
    payment_date TEXT,
    worked_hours INTEGER,
    material_cost INTEGER NOT NULL DEFAULT 0
  )
`;

async function getDatabaseBinding(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Databasbindningen DB saknas.");
  return env.DB;
}

export async function getDb() {
  return drizzle(await getDatabaseBinding(), { schema });
}

export async function ensureBookingsTable(): Promise<void> {
  if (databaseInitialized) return;
  const database = await getDatabaseBinding();
  await database.batch([
    database.prepare(bookingsTableSql),
    database.prepare("CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status)"),
    database.prepare("CREATE INDEX IF NOT EXISTS bookings_payment_date_idx ON bookings(payment_date)"),
  ]);
  databaseInitialized = true;
}

const pushSubscriptionsTableSql = `
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    admin_email TEXT NOT NULL,
    expiration_time INTEGER,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

export async function ensurePushSubscriptionsTable(): Promise<void> {
  if (pushSubscriptionsInitialized) return;
  const database = await getDatabaseBinding();
  await database.batch([
    database.prepare(pushSubscriptionsTableSql),
    database.prepare("CREATE INDEX IF NOT EXISTS push_subscriptions_admin_email_idx ON push_subscriptions(admin_email)"),
  ]);
  pushSubscriptionsInitialized = true;
}
