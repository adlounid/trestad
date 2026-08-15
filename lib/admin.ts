import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRuntimeValue } from "./runtime";

export type AdminUser = { email: string; displayName: string };

type AdminSession = {
  email: string;
  expiresAt: number;
};

const SESSION_COOKIE = "3stad_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export class AdminAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAccessError";
  }
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const decoded = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return bytes.buffer;
}

async function sessionKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requireRuntimeValue("ADMIN_SESSION_SECRET")),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

function isAllowedAdmin(email: string): boolean {
  const allowedEmails = requireRuntimeValue("ADMIN_EMAILS").split(",").map((value) => value.trim().toLowerCase());
  return allowedEmails.includes(email.toLowerCase());
}

export async function createAdminSession(email: string): Promise<string> {
  if (!isAllowedAdmin(email)) throw new AdminAccessError("Kontot saknar administratörsbehörighet.");
  const payload: AdminSession = { email: email.toLowerCase(), expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await sessionKey(), new TextEncoder().encode(encodedPayload));
  return encodedPayload + "." + base64UrlEncode(new Uint8Array(signature));
}

async function readAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [encodedPayload, encodedSignature] = value.split(".");
  if (!encodedPayload || !encodedSignature) return null;
  const signatureValid = await crypto.subtle.verify(
    "HMAC",
    await sessionKey(),
    base64UrlDecode(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!signatureValid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as AdminSession;
    if (!payload.email || payload.expiresAt <= Math.floor(Date.now() / 1000) || !isAllowedAdmin(payload.email)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function adminSessionDurationSeconds(): number {
  return SESSION_DURATION_SECONDS;
}

export async function requireAdminPage(): Promise<AdminUser> {
  const session = await readAdminSession();
  if (!session) redirect("/admin/login");
  return { email: session.email, displayName: session.email };
}

export async function requireAdminApi(): Promise<AdminUser> {
  const session = await readAdminSession();
  if (!session) throw new AdminAccessError("Du måste logga in som administratör.");
  return { email: session.email, displayName: session.email };
}

export function assertAllowedAdmin(email: string): void {
  if (!isAllowedAdmin(email)) throw new AdminAccessError("Kontot saknar administratörsbehörighet.");
}
