"use client";

export function AdminSignOut() {
  const signOut = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/login");
  };

  return <button className="admin-sign-out" type="button" onClick={signOut}>Logga ut</button>;
}
