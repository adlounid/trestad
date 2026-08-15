import { requireAdminPage } from "../../lib/admin";
import Link from "next/link";
import { listBookings, type AdminBooking } from "../../lib/bookings";
import { AdminDashboard } from "./admin-dashboard";
import { AdminSignOut } from "./admin-sign-out";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminPage();
  let bookings: AdminBooking[] = [];
  let storageError: string | null = null;

  try {
    bookings = await listBookings();
  } catch (error) {
    storageError = error instanceof Error ? error.message : "Kunde inte ansluta till lagringen.";
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div><Link className="brand" href="/"><span className="brand-mark">3</span><span>STÄD</span></Link><p>Administration · {admin.email}</p></div>
        <AdminSignOut />
      </header>
      <AdminDashboard initialBookings={bookings} storageError={storageError} />
    </div>
  );
}
