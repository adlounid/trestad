import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let databaseInitialized = false;

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

export function getDb() {
  if (!env.DB) throw new Error("Databasbindningen DB saknas.");
  return drizzle(env.DB, { schema });
}

export async function ensureBookingsTable(): Promise<void> {
  if (databaseInitialized) return;
  if (!env.DB) throw new Error("Databasbindningen DB saknas.");
  await env.DB.batch([
    env.DB.prepare(bookingsTableSql),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS bookings_payment_date_idx ON bookings(payment_date)"),
  ]);
  databaseInitialized = true;
}
