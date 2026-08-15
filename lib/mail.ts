import { ImapFlow, type FetchMessageObject, type MessageAddressObject, type MessageStructureObject } from "imapflow";
import nodemailer from "nodemailer";
import { requireRuntimeValue } from "./runtime";

const IMAP_HOST = "imap.strato.de";
const IMAP_PORT = 993;
const SMTP_HOST = "smtp.strato.de";
const SMTP_PORT = 465;
const MAX_MESSAGES = 40;
const MAX_BODY_BYTES = 512_000;

export type MailSummary = {
  uid: number;
  subject: string;
  from: string;
  replyTo: string;
  receivedAt: string;
  unread: boolean;
};

export type MailMessage = MailSummary & {
  to: string;
  body: string;
};

export type OutgoingMail = {
  to: string;
  subject: string;
  body: string;
};

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigurationError";
  }
}

function mailCredentials(): { user: string; pass: string } {
  try {
    return {
      user: requireRuntimeValue("STRATO_MAIL_USER"),
      pass: requireRuntimeValue("STRATO_MAIL_PASSWORD"),
    };
  } catch (error) {
    throw new MailConfigurationError(error instanceof Error ? error.message : "Strato-kontot är inte konfigurerat.");
  }
}

function createImapClient(): ImapFlow {
  return new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: mailCredentials(),
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 90_000,
  });
}

function formatAddresses(addresses: MessageAddressObject[] | undefined): string {
  return (addresses ?? []).map((address) => {
    const email = address.address ?? "";
    return address.name ? address.name + " <" + email + ">" : email;
  }).filter(Boolean).join(", ");
}

function toSummary(message: FetchMessageObject): MailSummary {
  const from = formatAddresses(message.envelope?.from);
  return {
    uid: message.uid,
    subject: message.envelope?.subject?.trim() || "(utan ämne)",
    from: from || "Okänd avsändare",
    replyTo: formatAddresses(message.envelope?.replyTo) || from,
    receivedAt: new Date(message.internalDate ?? message.envelope?.date ?? Date.now()).toISOString(),
    unread: !message.flags?.has("\\Seen"),
  };
}

function findReadablePart(structure: MessageStructureObject | undefined): string | undefined {
  if (!structure) return undefined;
  if (structure.type.toLowerCase() === "text/plain" && structure.part) return structure.part;
  for (const child of structure.childNodes ?? []) {
    const part = findReadablePart(child);
    if (part) return part;
  }
  if (structure.type.toLowerCase() === "text/html" && structure.part) return structure.part;
  for (const child of structure.childNodes ?? []) {
    if (child.type.toLowerCase() === "text/html" && child.part) return child.part;
  }
  return undefined;
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function withMailRetry<Result>(operationName: string, operation: () => Promise<Result>): Promise<Result> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn("mail_operation_retry", { operation: operationName, attempt, error });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("E-poståtgärden misslyckades: " + operationName);
}

async function withInbox<Result>(operationName: string, action: (client: ImapFlow) => Promise<Result>): Promise<Result> {
  return withMailRetry(operationName, async () => {
    const client = createImapClient();
    try {
      await client.connect();
      await client.mailboxOpen("INBOX");
      return await action(client);
    } finally {
      client.close();
    }
  });
}

export async function listInbox(): Promise<MailSummary[]> {
  return withInbox("list_inbox", async (client) => {
    const result = await client.search({ all: true }, { uid: true });
    const uids = Array.isArray(result) ? result.slice(-MAX_MESSAGES) : [];
    if (uids.length === 0) return [];
    const messages = await client.fetchAll(uids, { envelope: true, flags: true, internalDate: true, uid: true }, { uid: true });
    return messages.map(toSummary).sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
  });
}

export async function readInboxMessage(uid: number): Promise<MailMessage> {
  if (!Number.isInteger(uid) || uid < 1) throw new TypeError("Meddelandets uid är ogiltigt.");
  return withInbox("read_message", async (client) => {
    const message = await client.fetchOne(uid, { bodyStructure: true, envelope: true, flags: true, internalDate: true, uid: true }, { uid: true });
    if (!message) throw new Error("Meddelandet finns inte längre i inkorgen.");
    const part = findReadablePart(message.bodyStructure);
    const body = part ? stripHtml(await readStream((await client.download(uid, part, { uid: true, maxBytes: MAX_BODY_BYTES })).content)) : "Det här meddelandet saknar en läsbar textdel.";
    await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    return { ...toSummary(message), unread: false, to: formatAddresses(message.envelope?.to), body };
  });
}

export async function unreadInboxCount(): Promise<number> {
  return withInbox("count_unread", async (client) => {
    const result = await client.search({ seen: false }, { uid: true });
    return Array.isArray(result) ? result.length : 0;
  });
}

export async function sendMail(message: OutgoingMail): Promise<void> {
  const to = message.to.trim();
  const subject = message.subject.trim();
  const body = message.body.trim();
  if (!/^\S+@\S+\.\S+$/.test(to)) throw new TypeError("Ange en giltig mottagaradress.");
  if (!subject) throw new TypeError("Ämne måste fyllas i.");
  if (!body) throw new TypeError("Meddelandet måste fyllas i.");
  await withMailRetry("send_mail", async () => {
    const credentials = mailCredentials();
    const transport = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: true, auth: credentials });
    const result = await transport.sendMail({ from: credentials.user, to, subject, text: body });
    if (!result.accepted.includes(to)) {
      throw new Error("Strato nekade mottagaren. Svar: " + result.response);
    }
  });
}
