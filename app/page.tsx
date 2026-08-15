import type { Metadata } from "next";
import { BookingExperience } from "./booking-experience";

export const metadata: Metadata = {
  title: "3 Städ Helsingborg | Lokal flytt och hemstädning",
  description: "Boka flyttstädning, hemstädning eller storstädning i Helsingborg med tydliga priser efter RUT.",
};

export default function Home() {
  return <BookingExperience />;
}
