import { env } from "cloudflare:workers";

type RuntimeEnvironment = {
  DB: D1Database;
  PII_ENCRYPTION_KEY?: string;
  ADMIN_EMAILS?: string;
  ADMIN_SESSION_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
};

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return env as unknown as RuntimeEnvironment;
}

export function requireRuntimeValue(name: "PII_ENCRYPTION_KEY" | "ADMIN_EMAILS" | "ADMIN_SESSION_SECRET"): string {
  const value = getRuntimeEnvironment()[name]?.trim();
  if (!value) throw new Error("Miljövariabeln " + name + " saknas.");
  return value;
}
