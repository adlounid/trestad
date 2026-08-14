export type DistanceEstimate = { kilometers: number; label: string };
export type PriceBreakdown = { laborCost: number; travelFee: number; rutDeduction: number; customerTotal: number };

const DISTANCES: Readonly<Record<string, DistanceEstimate>> = {
  "250": { kilometers: 0, label: "Helsingborg" }, "251": { kilometers: 0, label: "Helsingborg" },
  "252": { kilometers: 0, label: "Helsingborg" }, "253": { kilometers: 0, label: "Helsingborg" },
  "254": { kilometers: 0, label: "Helsingborg" }, "255": { kilometers: 0, label: "Helsingborg" },
  "256": { kilometers: 0, label: "Helsingborg" }, "257": { kilometers: 0, label: "Helsingborg" },
  "258": { kilometers: 0, label: "Helsingborg" }, "259": { kilometers: 0, label: "Helsingborg" },
  "260": { kilometers: 18, label: "18 km" }, "261": { kilometers: 26, label: "26 km" },
  "262": { kilometers: 30, label: "30 km" }, "263": { kilometers: 22, label: "22 km" },
  "264": { kilometers: 35, label: "35 km" }, "265": { kilometers: 24, label: "24 km" },
  "266": { kilometers: 48, label: "48 km" }, "267": { kilometers: 23, label: "23 km" },
  "268": { kilometers: 39, label: "39 km" }, "269": { kilometers: 55, label: "55 km" },
};

export function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function getDistanceForPostalCode(value: string): DistanceEstimate | null {
  const postalCode = normalizePostalCode(value);
  if (postalCode.length < 3) return { kilometers: 0, label: "Helsingborg" };
  return DISTANCES[postalCode.slice(0, 3)] ?? null;
}

export function calculatePrice(squareMeters: number, kilometers: number, rutEnabled: boolean): PriceBreakdown {
  const area = Number.isFinite(squareMeters) ? Math.max(0, Math.round(squareMeters)) : 0;
  const distance = Number.isFinite(kilometers) ? Math.max(0, kilometers) : 0;
  const laborCost = area * 34;
  const travelFee = Math.round(distance * 1.2);
  const rutDeduction = rutEnabled ? Math.round(laborCost * 0.5) : 0;
  return { laborCost, travelFee, rutDeduction, customerTotal: laborCost + travelFee - rutDeduction };
}

export function formatSek(value: number): string {
  return new Intl.NumberFormat("sv-SE").format(value) + " kr";
}
