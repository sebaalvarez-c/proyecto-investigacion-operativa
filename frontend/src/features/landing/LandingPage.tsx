import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableCount } from '../../services/api';

export function LandingPage() {
  const [available, setAvailable] = useState<number | null>(null);

  useEffect(() => {
    const load = () => getAvailableCount().then(setAvailable).catch(() => {});
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-mark">✚</span>
          <span>EmergIA<span>Sistema de Emergencias</span></span>
        </div>
        <Link to="/dispatch" className="button button-primary landing-nav-btn">
          Abrir panel →
        </Link>
      </header>

      <main className="landing-main">
        <div className="landing-left">
          <p className="eyebrow">Investigación Operativa · Santa Cruz de la Sierra</p>
          <h1>Despacho inteligente<br/>de <em>ambulancias</em></h1>

          <div className="landing-tagline-box">
            <span className="landing-tagline-mark">🚨</span>
            <p>Cuando el momento es crítico,<br/><strong>EmergIA está para vos.</strong></p>
          </div>

          <div className="landing-live-stats">
            <div className={`stat-pill${available !== null && available > 0 ? ' stat-pill--green' : ''}`}>
              <span className="stat-pill-num">{available ?? '—'}</span>
              <span className="stat-pill-label">ambulancias<br/>disponibles</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-num">28</span>
              <span className="stat-pill-label">hospitales<br/>conectados</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-num">~1.8s</span>
              <span className="stat-pill-label">transcripción<br/>de audio</span>
            </div>
          </div>

          <div className="landing-pillars-row">
            <div className="pillar-chip">
              <span>🧮</span>
              <div>
                <strong>Vogel + MODI</strong>
                <small>Asignación óptima de ambulancias a hospitales</small>
              </div>
            </div>
            <div className="pillar-chip">
              <span>🎙️</span>
              <div>
                <strong>Gemini 3.5 Flash</strong>
                <small>Transcripción de audio médico en ~1.8 segundos</small>
              </div>
            </div>
            <div className="pillar-chip">
              <span>📡</span>
              <div>
                <strong>Telegram + Email</strong>
                <small>Alertas automáticas ambulancia ↔ hospital</small>
              </div>
            </div>
          </div>

          <Link to="/dispatch" className="button button-primary landing-cta-btn">
            Abrir panel de despacho →
          </Link>
          <p className="landing-disclaimer">Simulación académica · No es un servicio de emergencias real</p>
        </div>

        <div className="landing-right">
          <p className="eyebrow">Demo en vivo</p>
          <p className="landing-qr-lead">Escaneá con tu celular para participar:</p>
          <div className="landing-qrs">
            <div className="qr-card">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?data=https://ambulance-transport.vercel.app/ambulance&size=140x140&bgcolor=ffffff&color=16324f&margin=8"
                alt="QR para vista de Ambulancia"
                width="140"
                height="140"
              />
              <strong>🚑 Vista Ambulancia</strong>
              <small>Grabá audio y enviá mensajes al hospital</small>
            </div>
            <div className="qr-card">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?data=https://ambulance-transport.vercel.app/hospital&size=140x140&bgcolor=ffffff&color=16324f&margin=8"
                alt="QR para vista de Hospital"
                width="140"
                height="140"
              />
              <strong>🏥 Vista Hospital</strong>
              <small>Recibí alertas y respondé a la ambulancia</small>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
