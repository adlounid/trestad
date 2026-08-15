import { AdminAccessError, requireAdminApi } from "../../../../lib/admin";
import { listInbox, MailConfigurationError, readInboxMessage, sendMail, type OutgoingMail } from "../../../../lib/mail";

function errorResponse(error: unknown): Response {
  if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof MailConfigurationError) return Response.json({ error: "Strato-kontot är inte konfigurerat ännu." }, { status: 503 });
  if (error instanceof TypeError) return Response.json({ error: error.message }, { status: 400 });
  console.error("admin_mail_failed", { error });
  return Response.json({ error: "Kunde inte ansluta till Strato. Kontrollera kontots uppgifter och försök igen." }, { status: 502 });
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdminApi();
    const uidValue = new URL(request.url).searchParams.get("uid");
    if (!uidValue) return Response.json({ messages: await listInbox() });
    return Response.json({ message: await readInboxMessage(Number.parseInt(uidValue, 10)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminApi();
    const message = (await request.json()) as OutgoingMail;
    await sendMail(message);
    return Response.json({ sent: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
