import { sendDailyInboxNotifications } from "../../../../../lib/notifications";
import { requireRuntimeValue } from "../../../../../lib/runtime";

export async function POST(request: Request): Promise<Response> {
  try {
    const authorization = request.headers.get("authorization");
    if (authorization !== "Bearer " + requireRuntimeValue("CRON_SECRET")) {
      return Response.json({ error: "Ogiltig schemaläggningsnyckel." }, { status: 401 });
    }
    return Response.json(await sendDailyInboxNotifications());
  } catch (error) {
    console.error("daily_inbox_notification_failed", { error });
    return Response.json({ error: "Den dagliga inkorgsnotisen kunde inte skickas." }, { status: 500 });
  }
}
