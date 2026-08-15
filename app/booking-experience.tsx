"use client";

import { FormEvent, useMemo, useState } from "react";
import { CLEANING_SERVICES, calculatePrice, formatSek, getCleaningService, getDistanceForPostalCode, type ServiceType } from "../lib/pricing";

type BookingState = {
  fullName: string; email: string; phone: string; address: string; postalCode: string;
  city: string; personalNumber: string; squareMeters: string; serviceType: ServiceType; requestedDate: string;
  notes: string; consent: boolean;
};

const initialBooking: BookingState = {
  fullName: "", email: "", phone: "", address: "", postalCode: "", city: "",
  personalNumber: "", squareMeters: "75", serviceType: "movingCleaning", requestedDate: "", notes: "", consent: false,
};

export function BookingExperience() {
  const [booking, setBooking] = useState<BookingState>(initialBooking);
  const [rutEnabled, setRutEnabled] = useState<boolean>(true);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const squareMeters = Number.parseInt(booking.squareMeters, 10) || 0;
  const service = getCleaningService(booking.serviceType);
  const distance = getDistanceForPostalCode(booking.postalCode);
  const price = useMemo(
    () => calculatePrice(booking.serviceType, squareMeters, distance?.kilometers ?? 0, rutEnabled),
    [booking.serviceType, distance?.kilometers, rutEnabled, squareMeters],
  );

  const setField = <Key extends keyof BookingState>(key: Key, value: BookingState[Key]) => {
    setBooking((current) => ({ ...current, [key]: value }));
  };

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...booking, squareMeters, rutEnabled }),
      });
      const payload = (await response.json()) as { bookingId?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Bokningen kunde inte skickas.");
      setStatus("success");
      setMessage("Tack! Din förfrågan är registrerad som " + payload.bookingId + ". Vi återkommer med bekräftelse.");
      setBooking(initialBooking);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Bokningen kunde inte skickas.");
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="3 Städ, startsida"><span className="brand-mark">3</span><span>STÄD</span></a>
        <nav aria-label="Huvudnavigation"><a href="#tjansten">Tjänsten</a><a href="#sa-fungerar-det">Så funkar det</a><a className="nav-cta" href="#boka">Räkna pris</a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">LOKAL FLYTT &amp; HEMSTÄDNING · HELSINGBORG</p>
          <h1>Rent hemma.<br /><em>Klart pris.</em></h1>
          <p className="hero-lead">Lokal flytt och hemstädning utan krångliga paket. Du ser hela uträkningen direkt och väljer själv när det passar.</p>
          <div className="hero-actions"><a className="button button-dark" href="#boka">Räkna ditt pris</a><a className="text-link" href="#sa-fungerar-det">Se vad som ingår <span>→</span></a></div>
          <div className="hero-facts"><div><strong>29,50 kr</strong><span>per m² flyttstäd efter RUT</span></div><div><strong>50 %</strong><span>RUT på arbetet</span></div><div><strong>1,20 kr</strong><span>per km utanför stan</span></div></div>
        </div>
        <div className="hero-card">
          <div className="hero-card-top"><span>Exempel</span><span>75 m² · Helsingborg</span></div>
          <div className="price-stamp"><span>Efter RUT</span><strong>2 212,50</strong><small>75 m² flyttstäd</small></div>
          <div className="room-lines" aria-hidden="true"><span className="room room-one" /><span className="room room-two" /><span className="room room-three" /><span className="spark spark-one">✦</span><span className="spark spark-two">✦</span></div>
          <p>Inga dolda startavgifter. Utkörning tillkommer bara utanför Helsingborg.</p>
        </div>
      </section>

      <section className="service-strip" id="tjansten"><p>Det här tar vi hand om</p><div className="service-list"><span>Lokal flytt</span><i>·</i><span>Hemstädning</span><i>·</i><span>Kök &amp; ytor</span><i>·</i><span>Badrum</span><i>·</i><span>Golvvård</span></div></section>

      <section className="price-list"><p className="eyebrow">TYDLIGA PRISER</p><h2>Pris före och efter RUT.</h2><table><thead><tr><th>Tjänst</th><th>Före RUT</th><th>Efter RUT</th></tr></thead><tbody>{Object.values(CLEANING_SERVICES).map((item) => <tr key={item.id}><th>{item.label}</th><td>{formatSek(item.priceBeforeRut)}/{item.unit}</td><td>{formatSek(item.priceBeforeRut * 0.5)}/{item.unit}</td></tr>)}</tbody></table><p>Utkörning utanför Helsingborg tillkommer med 1,20 kr per km.</p></section>

      <section className="booking-section" id="boka">
        <div className="booking-intro">
          <p className="eyebrow">PRISRÄKNARE</p><h2>Vad kostar det<br />hemma hos dig?</h2>
          <p>Välj tjänst och fyll i boyta eller antal timmar. Priset uppdateras medan du skriver.</p>
          <div className="privacy-note"><span className="lock-icon">●</span><p><strong>Dina uppgifter stannar hos oss.</strong><br />Personnumret krypteras och används bara för RUT-underlaget.</p></div>
        </div>

        <div className="calculator-card">
          <div className="calculator-inputs">
            <label><span>Tjänst</span><select value={booking.serviceType} onChange={(event) => setField("serviceType", event.target.value as ServiceType)}>{Object.values(CLEANING_SERVICES).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label><span>{service.unit === "m²" ? "Boyta" : "Antal timmar"}</span><div className="input-with-unit"><input type="number" min={service.unit === "m²" ? 20 : 1} max={service.unit === "m²" ? 600 : 999} value={booking.squareMeters} onChange={(event) => setField("squareMeters", event.target.value)} aria-label={service.unit === "m²" ? "Boyta i kvadratmeter" : "Antal timmar"} /><b>{service.unit}</b></div></label>
            <label><span>Postnummer</span><input inputMode="numeric" placeholder="252 21" value={booking.postalCode} onChange={(event) => setField("postalCode", event.target.value)} aria-label="Postnummer" /></label>
          </div>
          <div className="rut-toggle-row"><div><strong>RUT-avdrag</strong><span>50 % på arbetskostnaden</span></div><button className={"toggle " + (rutEnabled ? "active" : "")} type="button" role="switch" aria-checked={rutEnabled} onClick={() => setRutEnabled((value) => !value)}><span /></button></div>
          {booking.postalCode.length >= 3 && !distance ? <p className="distance-warning">Vi kör i nordvästra Skåne. Kontrollera postnumret eller kontakta oss för pris utanför området.</p> : null}
          <div className="price-breakdown">
            <div><span>{service.label}, {squareMeters} {service.unit} × {formatSek(service.priceBeforeRut)}</span><strong>{formatSek(price.laborCost)}</strong></div>
            <div><span>Utkörning {distance?.label ?? "utanför området"}</span><strong>{price.travelFee === 0 ? "0 kr" : formatSek(price.travelFee)}</strong></div>
            {rutEnabled ? <div className="rut-line"><span>Preliminärt RUT-avdrag</span><strong>−{formatSek(price.rutDeduction)}</strong></div> : null}
          </div>
          <div className="price-total"><span>Att betala</span><strong>{formatSek(price.customerTotal)}</strong></div>
          <p className="price-fineprint">Preliminärt pris inklusive moms. Slutligt pris bekräftas innan bokning.</p>

          <details className="booking-details">
            <summary>Fortsätt till bokning <span>→</span></summary>
            <form onSubmit={submitBooking}>
              <div className="form-grid">
                <label><span>Namn</span><input required autoComplete="name" value={booking.fullName} onChange={(event) => setField("fullName", event.target.value)} /></label>
                <label><span>Telefon</span><input required autoComplete="tel" value={booking.phone} onChange={(event) => setField("phone", event.target.value)} /></label>
                <label className="wide"><span>E-post</span><input required type="email" autoComplete="email" value={booking.email} onChange={(event) => setField("email", event.target.value)} /></label>
                <label className="wide"><span>Adress</span><input required autoComplete="street-address" value={booking.address} onChange={(event) => setField("address", event.target.value)} /></label>
                <label><span>Postnummer</span><input required inputMode="numeric" value={booking.postalCode} onChange={(event) => setField("postalCode", event.target.value)} /></label>
                <label><span>Ort</span><input required value={booking.city} onChange={(event) => setField("city", event.target.value)} /></label>
                <label><span>Önskat datum</span><input required type="date" value={booking.requestedDate} onChange={(event) => setField("requestedDate", event.target.value)} /></label>
                <label><span>Personnummer för RUT</span><input required={rutEnabled} disabled={!rutEnabled} inputMode="numeric" placeholder="ÅÅÅÅMMDD-NNNN" value={booking.personalNumber} onChange={(event) => setField("personalNumber", event.target.value)} /></label>
                <label className="wide"><span>Något vi ska veta?</span><textarea rows={3} value={booking.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
              </div>
              <label className="consent-row"><input required type="checkbox" checked={booking.consent} onChange={(event) => setField("consent", event.target.checked)} /><span>Jag godkänner att 3 Städ behandlar mina uppgifter för bokning, fakturering och RUT-ansökan.</span></label>
              <button className="button button-accent form-submit" type="submit" disabled={status === "sending" || !distance}>{status === "sending" ? "Skickar…" : "Skicka bokningsförfrågan"}</button>
              {message ? <p className={"form-message " + status}>{message}</p> : null}
            </form>
          </details>
        </div>
      </section>

      <section className="process-section" id="sa-fungerar-det">
        <div className="process-heading"><p className="eyebrow">ENKELT FRÅN START</p><h2>Tre steg till ett<br />renare hem.</h2></div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Räkna</h3><p>Fyll i boyta och postnummer. Du ser arbetskostnad, resa och RUT var för sig.</p></div></li>
          <li><span>02</span><div><h3>Boka</h3><p>Skicka dina önskemål. Vi går igenom uppgifterna och bekräftar tid och slutpris.</p></div></li>
          <li><span>03</span><div><h3>Kom hem</h3><p>Vi städar enligt överenskommelsen. Du betalar elektroniskt och vi sköter RUT-ansökan.</p></div></li>
        </ol>
      </section>

      <section className="local-section"><div className="local-badge">56°03′N<br />12°42′E</div><div><p className="eyebrow">HEMMA I HELSINGBORG</p><h2>Nära till hands.<br />Noggranna på plats.</h2><p>Vi utgår från Helsingborg och arbetar i hela nordvästra Skåne. För adresser utanför staden syns utkörningen tydligt i priset.</p></div></section>
      <footer><div className="footer-brand"><span className="brand-mark">3</span><span>STÄD</span></div><p>Lokal flytt och hemstädning i Helsingborg med raka besked.</p><div className="footer-links"><a href="mailto:info@stadtre.se">info@stadtre.se</a><a href="#boka">Boka städning</a><a href="/admin">Admin</a></div><small>© 2026 3 Städ · Helsingborg</small></footer>
    </main>
  );
}
