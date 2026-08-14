"use client";

import { FormEvent, useState } from "react";

const FIREBASE_WEB_API_KEY = "AIzaSyC9SiO7MzFCqVlLr3B7FwglU5GC36aqOBw";

export function AdminLoginForm() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const authResponse = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE_WEB_API_KEY, {
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const authPayload = (await authResponse.json()) as { idToken?: string; error?: { message?: string } };
      if (!authResponse.ok || !authPayload.idToken) throw new Error("Fel e-post eller lösenord.");
      const sessionResponse = await fetch("/api/admin/session", {
        body: JSON.stringify({ idToken: authPayload.idToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const sessionPayload = (await sessionResponse.json()) as { error?: string };
      if (!sessionResponse.ok) throw new Error(sessionPayload.error ?? "Kontot saknar administratörsbehörighet.");
      window.location.assign("/admin");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Inloggningen kunde inte genomföras.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <label><span>E-post</span><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Lösenord</span><input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="button button-accent" type="submit" disabled={isSubmitting}>{isSubmitting ? "Loggar in…" : "Logga in"}</button>
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
