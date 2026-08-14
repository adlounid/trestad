import { AdminAccessError, requireAdminApi } from "../../../../lib/admin";
import { listBookings } from "../../../../lib/bookings";
import { createSkatteverketXml } from "../../../../lib/skatteverket-xml";

export async function GET(request: Request) {
  try {
    await requireAdminApi();
    const yearValue = new URL(request.url).searchParams.get("year");
    const year = yearValue ? Number.parseInt(yearValue, 10) : new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2020 || year > 2100) return Response.json({ error: "Ogiltigt betalningsår." }, { status: 400 });
    const xml = createSkatteverketXml(await listBookings(), year);
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": 'attachment; filename="3stad-rut-' + year + '.xml"',
      },
    });
  } catch (error) {
    if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 403 });
    console.error("skatteverket_export_failed", { error });
    return Response.json({ error: error instanceof Error ? error.message : "Exporten kunde inte skapas." }, { status: 400 });
  }
}
