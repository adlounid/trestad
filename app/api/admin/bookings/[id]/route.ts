import { AdminAccessError, requireAdminApi } from "../../../../../lib/admin";
import { BookingUpdate, BookingValidationError, updateBooking } from "../../../../../lib/bookings";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await context.params;
    const update = (await request.json()) as BookingUpdate;
    await updateBooking(id, update);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 403 });
    if (error instanceof BookingValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("booking_update_failed", { error });
    return Response.json({ error: "Bokningen kunde inte uppdateras." }, { status: 500 });
  }
}
