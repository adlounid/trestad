import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <a className="brand" href="/"><span className="brand-mark">3</span><span>STÄD</span></a>
        <p className="eyebrow">ADMINPORTAL</p>
        <h1>Logga in</h1>
        <p>Endast godkända administratörer har tillgång till bokningar och RUT-underlag.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
