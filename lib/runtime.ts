type RuntimeEnvironment = {
  PII_ENCRYPTION_KEY?: string;
  ADMIN_EMAILS?: string;
  ADMIN_SESSION_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  STRATO_MAIL_USER?: string;
  STRATO_MAIL_PASSWORD?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
};

export type RuntimeValueName = keyof RuntimeEnvironment;

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return {
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
    STRATO_MAIL_USER: process.env.STRATO_MAIL_USER,
    STRATO_MAIL_PASSWORD: process.env.STRATO_MAIL_PASSWORD,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    CRON_SECRET: process.env.CRON_SECRET,
  };
}

export function requireRuntimeValue(name: RuntimeValueName): string {
  const value = getRuntimeEnvironment()[name]?.trim();
  if (!value) throw new Error("Miljövariabeln " + name + " saknas.");
  return value;
}
