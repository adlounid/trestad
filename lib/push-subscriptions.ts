import { ensurePushSubscriptionsTable } from "../db";

export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushSubscriptionInput = StoredPushSubscription;

type PushSubscriptionRow = {
  endpoint: string;
  expiration_time: number | null;
  p256dh: string;
  auth: string;
};

function validateSubscription(subscription: PushSubscriptionInput): void {
  if (!subscription.endpoint.startsWith("https://")) throw new TypeError("Push-adressen är ogiltig.");
  if (!subscription.keys.p256dh || !subscription.keys.auth) throw new TypeError("Push-nycklar saknas.");
}

async function databaseBinding(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Databasbindningen DB saknas.");
  return env.DB;
}

export async function savePushSubscription(adminEmail: string, subscription: PushSubscriptionInput): Promise<void> {
  validateSubscription(subscription);
  await ensurePushSubscriptionsTable();
  const database = await databaseBinding();
  await database.prepare(`
    INSERT INTO push_subscriptions (endpoint, admin_email, expiration_time, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      admin_email = excluded.admin_email,
      expiration_time = excluded.expiration_time,
      p256dh = excluded.p256dh,
      auth = excluded.auth
  `).bind(
    subscription.endpoint,
    adminEmail,
    subscription.expirationTime,
    subscription.keys.p256dh,
    subscription.keys.auth,
    new Date().toISOString(),
  ).run();
}

export async function deletePushSubscription(adminEmail: string, endpoint: string): Promise<void> {
  if (!endpoint.startsWith("https://")) throw new TypeError("Push-adressen är ogiltig.");
  await ensurePushSubscriptionsTable();
  const database = await databaseBinding();
  await database.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND admin_email = ?").bind(endpoint, adminEmail).run();
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await ensurePushSubscriptionsTable();
  const database = await databaseBinding();
  await database.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
  await ensurePushSubscriptionsTable();
  const database = await databaseBinding();
  const result = await database.prepare("SELECT endpoint, expiration_time, p256dh, auth FROM push_subscriptions").all<PushSubscriptionRow>();
  return result.results.map((row: PushSubscriptionRow) => ({
    endpoint: row.endpoint,
    expirationTime: row.expiration_time,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }));
}
