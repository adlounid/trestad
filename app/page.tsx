import type { Metadata } from "next";
import { BookingExperience } from "./booking-experience";

export const metadata: Metadata = {
  title: "3 Städ Helsingborg | Lokal flytt och hemstädning",
  description: "Boka lokal flytt eller hemstädning i Helsingborg. 17 kr per kvadratmeter efter RUT.",
};

export default function Home() {
  return <BookingExperience />;
}
