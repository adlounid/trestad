import { env } from "cloudflare:workers";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri: string;
};

type FirestoreField = {
  booleanValue?: boolean;
  integerValue?: string;
  nullValue?: null;
  stringValue?: string;
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreField>;
  name: string;
};

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
};

function getServiceAccount(): ServiceAccount {
  const value = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!value) throw new Error("Firebase är inte konfigurerat.");

  try {
    const account = JSON.parse(value) as ServiceAccount;
    if (!account.client_email || !account.private_key || !account.project_id || !account.token_uri) {
      throw new Error("Servicekontot saknar obligatoriska uppgifter.");
    }
    return account;
  } catch (error) {
    throw new Error(error instanceof Error ? "Firebase-konfigurationen är ogiltig: " + error.message : "Firebase-konfigurationen är ogiltig.");
  }
}

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function createAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: account.token_uri,
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = header + "." + claims;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(account.private_key),
    { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = signingInput + "." + base64Url(new Uint8Array(signature));
  const response = await fetch(account.token_uri, {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error("Firebase-autentisering misslyckades: " + (payload.error_description ?? payload.error ?? String(response.status)));
  }
  return payload.access_token;
}

function documentUrl(account: ServiceAccount, collection: string, documentId?: string): string {
  const base = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(account.project_id) + "/databases/(default)/documents/" + encodeURIComponent(collection);
  return documentId ? base + "/" + encodeURIComponent(documentId) : base;
}

function toFields(values: Record<string, boolean | number | string | null>): Record<string, FirestoreField> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (value === null) return [key, { nullValue: null }];
    if (typeof value === "boolean") return [key, { booleanValue: value }];
    if (typeof value === "number") return [key, { integerValue: String(value) }];
    return [key, { stringValue: value }];
  }));
}

function fromFields(fields: Record<string, FirestoreField>): Record<string, boolean | number | string | null> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    if (value.stringValue !== undefined) return [key, value.stringValue];
    if (value.integerValue !== undefined) return [key, Number.parseInt(value.integerValue, 10)];
    if (value.booleanValue !== undefined) return [key, value.booleanValue];
    return [key, null];
  }));
}

async function requestFirestore(url: string, init: RequestInit): Promise<Response> {
  const account = getServiceAccount();
  const token = await createAccessToken(account);
  const response = await fetch(url, {
    ...init,
    headers: { authorization: "Bearer " + token, "content-type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error("Firestore-anropet misslyckades: " + (payload?.error?.message ?? String(response.status)));
  }
  return response;
}

export async function createFirestoreDocument(collection: string, documentId: string, values: Record<string, boolean | number | string | null>): Promise<void> {
  const account = getServiceAccount();
  await requestFirestore(documentUrl(account, collection) + "?documentId=" + encodeURIComponent(documentId), {
    body: JSON.stringify({ fields: toFields(values) }),
    method: "POST",
  });
}

export async function listFirestoreDocuments(collection: string): Promise<Record<string, boolean | number | string | null>[]> {
  const account = getServiceAccount();
  const response = await requestFirestore(documentUrl(account, collection) + "?pageSize=1000&orderBy=createdAt%20desc", { method: "GET" });
  const payload = (await response.json()) as FirestoreListResponse;
  return (payload.documents ?? []).map((document) => fromFields(document.fields ?? {}));
}

export async function updateFirestoreDocument(collection: string, documentId: string, values: Record<string, boolean | number | string | null>): Promise<void> {
  const account = getServiceAccount();
  const fieldPaths = Object.keys(values).map((field) => "updateMask.fieldPaths=" + encodeURIComponent(field)).join("&");
  await requestFirestore(documentUrl(account, collection, documentId) + "?" + fieldPaths, {
    body: JSON.stringify({ fields: toFields(values) }),
    method: "PATCH",
  });
}
