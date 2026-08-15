type RuntimeEnvironment = {
  PII_ENCRYPTION_KEY?: string;
  ADMIN_EMAILS?: string;
  ADMIN_SESSION_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
};

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return {
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
  };
}

export function requireRuntimeValue(name: "PII_ENCRYPTION_KEY" | "ADMIN_EMAILS" | "ADMIN_SESSION_SECRET"): string {
  const value = getRuntimeEnvironment()[name]?.trim();
  if (!value) throw new Error("Miljövariabeln " + name + " saknas.");
  return value;
}
