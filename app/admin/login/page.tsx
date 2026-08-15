import { AdminLoginForm } from "./admin-login-form";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <Link className="brand" href="/"><span className="brand-mark">3</span><span>STÄD</span></Link>
        <p className="eyebrow">ADMINPORTAL</p>
        <h1>Logga in</h1>
        <p>Endast godkända administratörer har tillgång till bokningar och RUT-underlag.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
