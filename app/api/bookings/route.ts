import { BookingValidationError, CreateBookingInput, createBooking } from "../../../lib/bookings";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateBookingInput;
    const bookingId = await createBooking(input);
    return Response.json({ bookingId }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("booking_create_failed", { error });
    return Response.json({ error: "Bokningen kunde inte sparas. Försök igen eller kontakta oss." }, { status: 500 });
  }
}
