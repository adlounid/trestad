"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminBooking, BookingStatus, BookingUpdate } from "../../lib/bookings";
import { formatSek } from "../../lib/pricing";
import { AdminMail } from "./admin-mail";

const statusLabels: Record<BookingStatus, string> = {
  new: "Ny", confirmed: "Bekräftad", completed: "Utförd", paid: "Betald",
  exported: "Exporterad", cancelled: "Avbokad",
};

type EditableBooking = AdminBooking & {
  invoiceNumberDraft: string; paymentDateDraft: string; workedHoursDraft: string;
  materialCostDraft: string; statusDraft: BookingStatus; saveState: "idle" | "saving" | "saved" | "error";
};

function toEditable(booking: AdminBooking): EditableBooking {
  return {
    ...booking,
    invoiceNumberDraft: booking.invoiceNumber ?? "",
    paymentDateDraft: booking.paymentDate ?? "",
    workedHoursDraft: booking.workedHours?.toString() ?? "",
    materialCostDraft: booking.materialCost.toString(),
    statusDraft: booking.status,
    saveState: "idle",
  };
}

export function AdminDashboard({ initialBookings, storageError }: { initialBookings: AdminBooking[]; storageError: string | null }) {
  const [view, setView] = useState<"bookings" | "mail">(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "mail" ? "mail" : "bookings");
  const [rows, setRows] = useState<EditableBooking[]>(initialBookings.map(toEditable));
  const [message, setMessage] = useState<string>("");
  const [exportError, setExportError] = useState<string>("");
  const currentYear = new Date().getFullYear();
  const stats = useMemo(() => ({
    newCount: rows.filter((row) => row.statusDraft === "new").length,
    paidCount: rows.filter((row) => row.statusDraft === "paid").length,
    value: rows.reduce((total, row) => total + row.customerTotal, 0),
  }), [rows]);
  const exportableRows = useMemo(
    () => rows.filter((row) => row.statusDraft === "paid" && row.paymentDateDraft && row.invoiceNumberDraft.trim() && row.workedHoursDraft),
    [rows],
  );

  const updateRow = <Key extends keyof EditableBooking>(id: string, key: Key, value: EditableBooking[Key]) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value, saveState: "idle" } : row));
  };

  const saveRow = async (row: EditableBooking) => {
    updateRow(row.id, "saveState", "saving");
    const update: BookingUpdate = {
      status: row.statusDraft,
      invoiceNumber: row.invoiceNumberDraft.trim() || null,
      paymentDate: row.paymentDateDraft || null,
      workedHours: row.workedHoursDraft ? Number.parseInt(row.workedHoursDraft, 10) : null,
      materialCost: Number.parseInt(row.materialCostDraft, 10) || 0,
    };
    try {
      const response = await fetch("/api/admin/bookings/" + encodeURIComponent(row.id), {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(update),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Kunde inte spara.");
      updateRow(row.id, "saveState", "saved");
      setMessage("");
    } catch (error) {
      updateRow(row.id, "saveState", "error");
      setMessage(error instanceof Error ? error.message : "Kunde inte spara.");
    }
  };

  const downloadXml = async () => {
    setExportError("");
    try {
      const response = await fetch("/api/admin/export?year=" + currentYear);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "XML-filen kunde inte skapas.");
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "3stad-rut-" + currentYear + ".xml";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "XML-filen kunde inte skapas.");
    }
  };

  return (
    <div className="admin-main">
      <nav className="admin-tabs" aria-label="Administration"><button className={view === "bookings" ? "active" : ""} type="button" onClick={() => setView("bookings")}>Bokningar</button><button className={view === "mail" ? "active" : ""} type="button" onClick={() => setView("mail")}>Inkorg</button></nav>
      {view === "mail" ? <AdminMail /> : <>
      <div className="admin-title-row">
        <div><p className="eyebrow">BOKNINGAR & RUT</p><h1>Överblick</h1><p>Bekräfta jobb, registrera betalning och skapa Skatteverkets XML-fil.</p></div>
        <div className="admin-actions"><Link className="admin-button" href="/">Visa kundsidan</Link><button className="admin-button primary" type="button" onClick={downloadXml} disabled={exportableRows.length === 0}>Ladda ner RUT XML</button></div>
      </div>
      <div className="admin-stats">
        <div className="admin-stat"><span>Nya förfrågningar</span><strong>{stats.newCount}</strong></div>
        <div className="admin-stat"><span>Klara för export</span><strong>{stats.paidCount}</strong></div>
        <div className="admin-stat"><span>Bokningsvärde</span><strong>{formatSek(stats.value)}</strong></div>
      </div>
      {storageError ? <p className="form-message error">Firebase är inte redo ännu. Aktivera Cloud Firestore i Firebase Console och ladda om sidan.</p> : null}
      {message ? <p className="form-message error">{message}</p> : null}
      {exportError ? <p className="form-message error">{exportError}</p> : null}
      {exportableRows.length === 0 ? <p className="admin-export-note">Fyll i betalningsdatum, fakturanummer och arbetade timmar. Välj sedan <strong>Betald</strong> som status och tryck <strong>Spara</strong> för att skapa XML.</p> : null}
      {rows.length === 0 ? <div className="empty-state"><h2>Inga bokningar ännu</h2><p>Nya förfrågningar visas här automatiskt.</p></div> : (
        <div className="booking-table-wrap">
          <table className="booking-table">
            <thead><tr><th>Kund</th><th>Städning</th><th>Pris</th><th>Status</th><th>Betalningsdatum</th><th>Faktura</th><th>Timmar</th><th>Material</th><th /></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td className="customer-cell"><strong>{row.fullName}</strong><span>{row.address}, {row.postalCode} {row.city}</span><span>{row.email} · {row.phone}</span><span>PN: {row.personalNumber || "Ej RUT"} · {row.id}</span></td>
                <td>{row.squareMeters} m²<br /><span className="status-chip">{row.requestedDate}</span>{row.notes ? <p>{row.notes}</p> : null}</td>
                <td><strong>{formatSek(row.customerTotal)}</strong><br /><small>RUT {formatSek(row.rutDeduction)}<br />Resa {formatSek(row.travelFee)}</small></td>
                <td><select value={row.statusDraft} onChange={(event) => updateRow(row.id, "statusDraft", event.target.value as BookingStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                <td><input type="date" value={row.paymentDateDraft} onChange={(event) => updateRow(row.id, "paymentDateDraft", event.target.value)} /></td>
                <td><input value={row.invoiceNumberDraft} onChange={(event) => updateRow(row.id, "invoiceNumberDraft", event.target.value)} placeholder="F-1001" /></td>
                <td><input type="number" min="1" max="999" value={row.workedHoursDraft} onChange={(event) => updateRow(row.id, "workedHoursDraft", event.target.value)} /></td>
                <td><input type="number" min="0" value={row.materialCostDraft} onChange={(event) => updateRow(row.id, "materialCostDraft", event.target.value)} /></td>
                <td><button className="admin-button" type="button" onClick={() => saveRow(row)} disabled={row.saveState === "saving"}>{row.saveState === "saving" ? "Sparar…" : row.saveState === "saved" ? "Sparat" : "Spara"}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      </>}
    </div>
  );
}
