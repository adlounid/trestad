import { AdminAccessError, requireAdminApi } from "../../../../lib/admin";
import { deletePushSubscription, savePushSubscription, type PushSubscriptionInput } from "../../../../lib/push-subscriptions";
import { requireRuntimeValue } from "../../../../lib/runtime";

function errorResponse(error: unknown): Response {
  if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof TypeError) return Response.json({ error: error.message }, { status: 400 });
  console.error("admin_push_subscription_failed", { error });
  return Response.json({ error: "Kunde inte spara notisinställningen." }, { status: 500 });
}

export async function GET(): Promise<Response> {
  try {
    await requireAdminApi();
    return Response.json({ publicKey: requireRuntimeValue("VAPID_PUBLIC_KEY") });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdminApi();
    const subscription = (await request.json()) as PushSubscriptionInput;
    await savePushSubscription(admin.email, subscription);
    return Response.json({ subscribed: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const admin = await requireAdminApi();
    const payload = (await request.json()) as { endpoint?: string };
    if (!payload.endpoint) throw new TypeError("Push-adressen saknas.");
    await deletePushSubscription(admin.email, payload.endpoint);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
