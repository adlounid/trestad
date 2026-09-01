type TrialLockProps = {
  invoicePaymentUrl: string | undefined;
};

export function TrialLock({ invoicePaymentUrl }: TrialLockProps) {
  const paymentLink = invoicePaymentUrl?.trim();

  return (
    <main className="trial-lock">
      <section className="trial-lock-card" aria-labelledby="trial-lock-title">
        <p className="eyebrow">ÅTKOMST PAUSAD</p>
        <h1 id="trial-lock-title">Din kostnadsfria provperiod har gått ut.</h1>
        <p>Betala din faktura för att fortsätta använda appen. Webbplatsen och admin är spärrade tills betalningen är registrerad.</p>
        {paymentLink ? <a className="button button-accent" href={paymentLink}>Betala faktura</a> : <a className="button button-accent" href="mailto:info@stadtre.se?subject=Faktura%20och%20fortsatt%20åtkomst">Kontakta fakturering</a>}
        <small>Behöver du hjälp? Kontakta <a href="mailto:info@stadtre.se">info@stadtre.se</a>.</small>
      </section>
    </main>
  );
}
