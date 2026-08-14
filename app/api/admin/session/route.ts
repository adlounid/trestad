import { adminSessionCookieName, adminSessionDurationSeconds, assertAllowedAdmin, createAdminSession } from "../../../../lib/admin";

type FirebaseLookupResponse = {
  users?: Array<{ email?: string }>;
};

const FIREBASE_WEB_API_KEY = "AIzaSyC9SiO7MzFCqVlLr3B7FwglU5GC36aqOBw";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { idToken?: string };
    if (!payload.idToken) return Response.json({ error: "Inloggningstoken saknas." }, { status: 400 });
    const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_WEB_API_KEY, {
      body: JSON.stringify({ idToken: payload.idToken }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const lookup = (await response.json()) as FirebaseLookupResponse;
    const email = lookup.users?.[0]?.email;
    if (!response.ok || !email) return Response.json({ error: "Firebase kunde inte verifiera inloggningen." }, { status: 401 });
    assertAllowedAdmin(email);
    const session = await createAdminSession(email);
    const isProduction = process.env.NODE_ENV === "production";
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
        "set-cookie": adminSessionCookieName() + "=" + session + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + adminSessionDurationSeconds() + (isProduction ? "; Secure" : ""),
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inloggningen kunde inte genomföras." }, { status: 403 });
  }
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: { "set-cookie": adminSessionCookieName() + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" } });
}
