import { AdminBooking } from "./bookings";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function requireExportValue(value: string | null, label: string, bookingId: string): string {
  if (!value) throw new Error(label + " saknas för bokning " + bookingId + ".");
  return value;
}

function bookingXml(booking: AdminBooking): string {
  if (!booking.rutEnabled || !booking.personalNumber) throw new Error("RUT-underlag saknas för bokning " + booking.id + ".");
  const paymentDate = requireExportValue(booking.paymentDate, "Betalningsdatum", booking.id);
  const invoiceNumber = requireExportValue(booking.invoiceNumber, "Fakturanummer", booking.id);
  if (!booking.workedHours) throw new Error("Arbetade timmar saknas för bokning " + booking.id + ".");
  return [
    "    <ns2:Arenden>",
    "      <ns2:Kopare>" + escapeXml(booking.personalNumber) + "</ns2:Kopare>",
    "      <ns2:BetalningsDatum>" + escapeXml(paymentDate) + "</ns2:BetalningsDatum>",
    "      <ns2:PrisForArbete>" + booking.laborCost + "</ns2:PrisForArbete>",
    "      <ns2:BetaltBelopp>" + (booking.laborCost - booking.rutDeduction) + "</ns2:BetaltBelopp>",
    "      <ns2:BegartBelopp>" + booking.rutDeduction + "</ns2:BegartBelopp>",
    "      <ns2:FakturaNr>" + escapeXml(invoiceNumber) + "</ns2:FakturaNr>",
    "      <ns2:Ovrigkostnad>" + booking.travelFee + "</ns2:Ovrigkostnad>",
    "      <ns2:UtfortArbete><ns2:Stadning>",
    "        <ns2:AntalTimmar>" + booking.workedHours + "</ns2:AntalTimmar>",
    "        <ns2:Materialkostnad>" + booking.materialCost + "</ns2:Materialkostnad>",
    "      </ns2:Stadning></ns2:UtfortArbete>",
    "    </ns2:Arenden>",
  ].join("\n");
}

export function createSkatteverketXml(allBookings: AdminBooking[], year: number): string {
  const exportable = allBookings.filter((booking) => booking.status === "paid" && booking.paymentDate?.startsWith(String(year)));
  if (exportable.length === 0) throw new Error("Det finns inga betalda RUT-bokningar att exportera för " + year + ".");
  const requestName = ("3Stad" + year).slice(0, 16);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ns1:Begaran xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    ' xmlns:ns1="http://xmls.skatteverket.se/se/skatteverket/ht/begaran/6.0"',
    ' xmlns:ns2="http://xmls.skatteverket.se/se/skatteverket/ht/komponent/begaran/6.0">',
    "  <ns2:NamnPaBegaran>" + requestName + "</ns2:NamnPaBegaran>",
    "  <ns2:HushallBegaran>",
    ...exportable.map(bookingXml),
    "  </ns2:HushallBegaran>",
    "</ns1:Begaran>",
  ].join("\n");
}
