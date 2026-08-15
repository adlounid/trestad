"use client";

import { useCallback, useEffect, useState } from "react";
import type { MailMessage, MailSummary, OutgoingMail } from "../../lib/mail";

type InboxResponse = { messages?: MailSummary[]; message?: MailMessage; error?: string };
type NotificationState = "checking" | "unsupported" | "off" | "on" | "working";

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const bytes = Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
  const result = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  result.set(bytes);
  return result;
}

async function responsePayload(response: Response): Promise<InboxResponse> {
  const payload = (await response.json()) as InboxResponse;
  if (!response.ok) throw new Error(payload.error ?? "Begäran misslyckades.");
  return payload;
}

async function detectNotificationState(currentSubscription: () => Promise<PushSubscription | null>): Promise<NotificationState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return await currentSubscription() ? "on" : "off";
}

function DailyNotifications(): React.ReactNode {
  const [state, setState] = useState<NotificationState>("checking");
  const [message, setMessage] = useState<string>("");

  const currentSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration.pushManager.getSubscription();
  }, []);

  useEffect(() => {
    void detectNotificationState(currentSubscription).then(setState).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Kunde inte kontrollera notiser.");
      setState("off");
    });
  }, [currentSubscription]);

  const enable = async (): Promise<void> => {
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Tillåt notiser i iPhone-inställningarna för att aktivera sammanfattningen.");
      const keyResponse = await fetch("/api/admin/push");
      const keyPayload = (await keyResponse.json()) as { publicKey?: string; error?: string };
      if (!keyResponse.ok || !keyPayload.publicKey) throw new Error(keyPayload.error ?? "Push-nyckeln saknas.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(keyPayload.publicKey) });
      const saveResponse = await fetch("/api/admin/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription) });
      await responsePayload(saveResponse);
      setState("on");
      setMessage("Daglig inkorgssammanfattning är aktiverad på den här enheten.");
    } catch (error) {
      setState("off");
      setMessage(error instanceof Error ? error.message : "Notiser kunde inte aktiveras.");
    }
  };

  const disable = async (): Promise<void> => {
    setState("working");
    setMessage("");
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        const response = await fetch("/api/admin/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        if (!response.ok) await responsePayload(response);
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Dagliga notiser är avstängda på den här enheten.");
    } catch (error) {
      setState("on");
      setMessage(error instanceof Error ? error.message : "Notiser kunde inte stängas av.");
    }
  };

  if (state === "unsupported") {
    return <div className="notification-card"><strong>iPhone-notiser</strong><p>Lägg admin på hemskärmen i Safari och öppna den därifrå för att aktivera dagliga notiser.</p></div>;
  }

  return (
    <div className="notification-card">
      <div><strong>Daglig iPhone-notis</strong><p>Få en sammanfattning av olästa mejl varje morgon.</p></div>
      <button className={state === "on" ? "admin-button" : "admin-button primary"} type="button" disabled={state === "checking" || state === "working"} onClick={state === "on" ? disable : enable}>
        {state === "checking" || state === "working" ? "Vänta…" : state === "on" ? "Stäng av" : "Aktivera på denna enhet"}
      </button>
      {message ? <p className="notification-message">{message}</p> : null}
    </div>
  );
}

export function AdminMail(): React.ReactNode {
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<OutgoingMail>({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState<boolean>(false);
  const [sentMessage, setSentMessage] = useState<string>("");

  const loadInbox = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const payload = await responsePayload(await fetch("/api/admin/mail", { cache: "no-store" }));
      setMessages(payload.messages ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inkorgen kunde inte hämtas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/mail", { cache: "no-store" })
      .then(responsePayload)
      .then((payload) => { if (active) setMessages(payload.messages ?? []); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Inkorgen kunde inte hämtas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openMessage = async (summary: MailSummary): Promise<void> => {
    setError("");
    try {
      const payload = await responsePayload(await fetch("/api/admin/mail?uid=" + summary.uid, { cache: "no-store" }));
      if (!payload.message) throw new Error("Meddelandet saknas.");
      setSelected(payload.message);
      setMessages((current) => current.map((message) => message.uid === summary.uid ? { ...message, unread: false } : message));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Meddelandet kunde inte läsas.");
    }
  };

  const reply = (): void => {
    if (!selected) return;
    setDraft({ to: selected.replyTo, subject: selected.subject.startsWith("Re:") ? selected.subject : "Re: " + selected.subject, body: "" });
    setComposeOpen(true);
  };

  const send = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSending(true);
    setError("");
    setSentMessage("");
    try {
      await responsePayload(await fetch("/api/admin/mail", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) }));
      setDraft({ to: "", subject: "", body: "" });
      setComposeOpen(false);
      setSentMessage("Mejlet skickades via Strato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mejlet kunde inte skickas.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mail-admin">
      <div className="mail-toolbar">
        <div><p className="eyebrow">STRATO IMAP / SMTP</p><h2>Inkorg</h2></div>
        <div className="admin-actions"><button className="admin-button" type="button" onClick={loadInbox} disabled={loading}>{loading ? "Hämtar…" : "Uppdatera"}</button><button className="admin-button primary" type="button" onClick={() => setComposeOpen(true)}>Nytt mejl</button></div>
      </div>
      <DailyNotifications />
      {error ? <p className="form-message error">{error}</p> : null}
      {sentMessage ? <p className="form-message success">{sentMessage}</p> : null}
      <div className="mail-layout">
        <div className="mail-list" aria-label="Inkorg">
          {!loading && messages.length === 0 ? <p className="mail-empty">Inga mejl i inkorgen.</p> : null}
          {messages.map((message) => <button className={"mail-row" + (message.unread ? " unread" : "") + (selected?.uid === message.uid ? " active" : "")} type="button" key={message.uid} onClick={() => openMessage(message)}><span>{message.from}</span><strong>{message.subject}</strong><time>{readableDate(message.receivedAt)}</time></button>)}
        </div>
        <article className="mail-reader">
          {selected ? <><div className="mail-reader-head"><div><h3>{selected.subject}</h3><p>Från {selected.from}<br />Till {selected.to}<br />{readableDate(selected.receivedAt)}</p></div><button className="admin-button" type="button" onClick={reply}>Svara</button></div><pre>{selected.body}</pre></> : <div className="mail-placeholder"><strong>Välj ett mejl</strong><p>Meddelandet visas här och markeras som läst.</p></div>}
        </article>
      </div>
      {composeOpen ? <div className="compose-backdrop" role="presentation" onMouseDown={() => setComposeOpen(false)}><form className="compose-card" onSubmit={send} onMouseDown={(event) => event.stopPropagation()}><div className="compose-heading"><h2>Nytt mejl</h2><button type="button" onClick={() => setComposeOpen(false)} aria-label="Stäng">Stäng</button></div><label><span>Till</span><input required type="email" value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></label><label><span>Ämne</span><input required value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} /></label><label><span>Meddelande</span><textarea required rows={12} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} /></label><button className="admin-button primary" type="submit" disabled={sending}>{sending ? "Skickar…" : "Skicka via Strato"}</button></form></div> : null}
    </section>
  );
}
