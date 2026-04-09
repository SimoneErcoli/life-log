import LifeLogDashboard from "../components/life-log-dashboard";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Life-Log Personal Dashboard</p>
          <h1>Abitudini, spese e note sotto il tuo controllo.</h1>
          <p className="hero-text">
            Nessuna registrazione, nessun server, nessun vincolo a una piattaforma.
            Importa un
            <code> file JSON </code>
            nel browser, aggiorna il tuo diario personale e scarica subito la
            versione aggiornata con tutte le modifiche.
          </p>
        </div>

        <div className="hero-rules">
          <div className="rule-card">
            <span>1</span>
            <p>Apri il sito e importa il tuo file locale.</p>
          </div>
          <div className="rule-card">
            <span>2</span>
            <p>Consulta grafici, calendario e tabelle generate dal JSON.</p>
          </div>
          <div className="rule-card">
            <span>3</span>
            <p>Modifica i dati e scarica il nuovo file aggiornato.</p>
          </div>
        </div>
      </section>

      <LifeLogDashboard />
    </main>
  );
}
