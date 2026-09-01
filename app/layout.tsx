import type { Metadata } from "next";
import "./globals.css";
import { TrialLock } from "./trial-lock";

export const metadata: Metadata = {
  title: "3 Städ Helsingborg",
  description: "Lokal flytt och hemstädning i Helsingborg med tydliga priser och RUT-avdrag.",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: { title: "3 Städ Helsingborg", description: "Rent hemma. Klart pris.", locale: "sv_SE", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteLocked = process.env.SITE_ACCESS_LOCKED !== "false";
  return <html lang="sv"><body>{siteLocked ? <TrialLock invoicePaymentUrl={process.env.INVOICE_PAYMENT_URL} /> : children}</body></html>;
}
