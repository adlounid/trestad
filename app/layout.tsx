import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3 Städ Helsingborg",
  description: "Lokal flytt och hemstädning i Helsingborg med tydliga priser och RUT-avdrag.",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: { title: "3 Städ Helsingborg", description: "Rent hemma. Klart pris.", locale: "sv_SE", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv"><body>{children}</body></html>;
}
