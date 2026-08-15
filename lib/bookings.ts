import { decryptPersonalNumber, encryptPersonalNumber } from "./encryption";
import { createFirestoreDocument, listFirestoreDocuments, updateFirestoreDocument } from "./firebase-firestore";
import { isValidPersonalNumber, normalizePersonalNumber } from "./personal-number";
import { calculatePrice, getCleaningService, getDistanceForPostalCode, normalizePostalCode, type ServiceType } from "./pricing";

export type CreateBookingInput = {
  fullName: string; email: string; phone: string; address: string; postalCode: string; city: string;
  personalNumber: string; squareMeters: number; serviceType: ServiceType; requestedDate: string; notes: string; consent: boolean; rutEnabled: boolean;
};

export type BookingStatus = "new" | "confirmed" | "completed" | "paid" | "exported" | "cancelled";

type Booking = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  personalNumberEncrypted: string;
  personalNumberLastFour: string;
  squareMeters: number;
  serviceType: ServiceType;
  serviceLabel: string;
  distanceKilometers: number;
  laborCost: number;
  travelFee: number;
  rutDeduction: number;
  customerTotal: number;
  rutEnabled: boolean;
  requestedDate: string;
  notes: string;
  status: BookingStatus;
  invoiceNumber: string | null;
  paymentDate: string | null;
  workedHours: number | null;
  materialCost: number;
};

export type AdminBooking = Omit<Booking, "personalNumberEncrypted"> & { personalNumber: string };
export type BookingUpdate = {
  status: BookingStatus; invoiceNumber: string | null; paymentDate: string | null;
  workedHours: number | null; materialCost: number;
};

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

function cleanRequired(value: string, label: string): string {
  const cleaned = value.trim();
  if (!cleaned) throw new BookingValidationError(label + " måste fyllas i.");
  return cleaned;
}

function createBookingId(now: Date): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  return "3S-" + date + "-" + crypto.randomUUID().slice(0, 4).toUpperCase();
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  if (!input.consent) throw new BookingValidationError("Du måste godkänna behandlingen av uppgifterna.");
  const service = getCleaningService(input.serviceType);
  const minimumQuantity = service.unit === "m²" ? 20 : 1;
  const maximumQuantity = service.unit === "m²" ? 600 : 999;
  if (!Number.isInteger(input.squareMeters) || input.squareMeters < minimumQuantity || input.squareMeters > maximumQuantity) {
    throw new BookingValidationError(service.unit === "m²" ? "Boytan måste vara mellan 20 och 600 m²." : "Antal timmar måste vara mellan 1 och 999.");
  }
  const postalCode = normalizePostalCode(input.postalCode);
  if (postalCode.length !== 5) throw new BookingValidationError("Ange ett giltigt femsiffrigt postnummer.");
  const distance = getDistanceForPostalCode(postalCode);
  if (!distance) throw new BookingValidationError("Vi kan inte räkna utkörning för det postnumret ännu. Kontakta oss för offert.");
  const personalNumber = normalizePersonalNumber(input.personalNumber);
  if (input.rutEnabled && !isValidPersonalNumber(personalNumber)) {
    throw new BookingValidationError("Personnumret verkar inte vara giltigt. Ange 12 siffror.");
  }
  const email = cleanRequired(input.email, "E-post");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new BookingValidationError("Ange en giltig e-postadress.");
  const now = new Date();
  const id = createBookingId(now);
  const price = calculatePrice(input.serviceType, input.squareMeters, distance.kilometers, input.rutEnabled);
  await createFirestoreDocument("bookings", id, {
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    fullName: cleanRequired(input.fullName, "Namn"),
    email,
    phone: cleanRequired(input.phone, "Telefon"),
    address: cleanRequired(input.address, "Adress"),
    postalCode,
    city: cleanRequired(input.city, "Ort"),
    personalNumberEncrypted: await encryptPersonalNumber(personalNumber),
    personalNumberLastFour: personalNumber.slice(-4),
    squareMeters: input.squareMeters,
    serviceType: service.id,
    serviceLabel: service.label,
    distanceKilometers: distance.kilometers,
    laborCost: price.laborCost,
    travelFee: price.travelFee,
    rutDeduction: price.rutDeduction,
    customerTotal: price.customerTotal,
    rutEnabled: input.rutEnabled,
    requestedDate: cleanRequired(input.requestedDate, "Önskat datum"),
    notes: input.notes.trim(),
    status: "new",
    materialCost: 0,
  });
  return id;
}

export async function listBookings(): Promise<AdminBooking[]> {
  const rows = await listFirestoreDocuments("bookings") as unknown as Booking[];
  return Promise.all(rows.map(async ({ personalNumberEncrypted, ...booking }) => ({
    ...booking,
    personalNumber: await decryptPersonalNumber(personalNumberEncrypted),
  })));
}

export async function updateBooking(id: string, update: BookingUpdate): Promise<void> {
  if (!id.trim()) throw new BookingValidationError("Boknings-id saknas.");
  if (update.workedHours !== null && (!Number.isInteger(update.workedHours) || update.workedHours < 1 || update.workedHours > 999)) {
    throw new BookingValidationError("Arbetade timmar måste vara ett heltal mellan 1 och 999.");
  }
  if (!Number.isInteger(update.materialCost) || update.materialCost < 0) throw new BookingValidationError("Materialkostnaden är ogiltig.");
  await updateFirestoreDocument("bookings", id, { ...update, updatedAt: new Date().toISOString() });
}
