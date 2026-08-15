import webPush from "web-push";
import { unreadInboxCount } from "./mail";
import { deletePushSubscriptionByEndpoint, listPushSubscriptions, type StoredPushSubscription } from "./push-subscriptions";
import { requireRuntimeValue } from "./runtime";

type PushFailure = Error & { statusCode?: number };

function configureWebPush(): void {
  webPush.setVapidDetails(
    requireRuntimeValue("VAPID_SUBJECT"),
    requireRuntimeValue("VAPID_PUBLIC_KEY"),
    requireRuntimeValue("VAPID_PRIVATE_KEY"),
  );
}

async function sendWithRetry(subscription: StoredPushSubscription, payload: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await webPush.sendNotification(subscription, payload, { TTL: 60 * 60 * 12, urgency: "normal" });
      return;
    } catch (error) {
      lastError = error;
      const statusCode = (error as PushFailure).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscriptionByEndpoint(subscription.endpoint);
        return;
      }
      console.warn("push_notification_retry", { endpoint: subscription.endpoint, attempt, statusCode, error });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Push-notisen kunde inte skickas.");
}

export async function sendDailyInboxNotifications(): Promise<{ unreadCount: number; recipientCount: number }> {
  configureWebPush();
  const [unreadCount, subscriptions] = await Promise.all([unreadInboxCount(), listPushSubscriptions()]);
  const body = unreadCount === 0 ? "Inkorgen är tom på nya mejl." : unreadCount === 1 ? "Du har 1 oläst mejl i Strato-inkorgen." : "Du har " + unreadCount + " olästa mejl i Strato-inkorgen.";
  const payload = JSON.stringify({ title: "3 Städ · daglig inkorg", body, url: "/admin?view=mail" });
  const failures: Error[] = [];
  for (const subscription of subscriptions) {
    try {
      await sendWithRetry(subscription, payload);
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error("Okänt push-fel."));
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, "Kunde inte skicka " + failures.length + " push-notiser.");
  return { unreadCount, recipientCount: subscriptions.length };
}
