import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllMessages, sendMessage, type CommunicationMessage } from '../../services/api';
import { useRecipientEmail } from '../../hooks/useRecipientEmail';

interface IncomingAmbulance {
  id: string;
  code: string;
  emergencyId: string;
  etaMinutes: number;
  condition: string;
  phase: string;
}

const MOCK_AMBULANCES: IncomingAmbulance[] = [
  { id: '1', code: 'AMB-003', emergencyId: 'demo-emergency', etaMinutes: 6, condition: 'Trauma moderado', phase: 'En camino' },
  { id: '2', code: 'AMB-007', emergencyId: 'demo-emergency-2', etaMinutes: 14, condition: 'Politraumatismo', phase: 'En camino' },
];

const POLL_INTERVAL_MS = 5000;

export function HospitalPage() {
  const [recipientEmail, setRecipientEmail] = useRecipientEmail();
  const [selected, setSelected] = useState<string>(MOCK_AMBULANCES[0].id);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAmb = MOCK_AMBULANCES.find((a) => a.id === selected);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function loadMessages() {
    try {
      setMessages(await getAllMessages());
    } catch {
      // silent — keep existing messages
    }
  }

  async function sendReply(text: string) {
    if (!text.trim() || !selectedAmb) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({
        emergencyId: selectedAmb.emergencyId,
        from: 'hospital',
        text: text.trim(),
        isAudio: false,
        recipientEmail: recipientEmail || undefined,
      });
      setReply('');
      void loadMessages();
    } catch {
      setError('No se pudo enviar el mensaje. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  const visibleMessages = selectedAmb
    ? messages.filter((m) => m.emergencyId === selectedAmb.emergencyId)
    : [];

  return (
    <div className="app-shell dispatch-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ambulance Transport inicio">
          <span className="brand-mark">✚</span>
          <span>AMBULANCE<span>TRANSPORT</span></span>
        </a>
        <nav className="page-nav" aria-label="Vistas">
          <NavLink to="/" end className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Despacho</NavLink>
          <NavLink to="/ambulance" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Ambulancia</NavLink>
          <NavLink to="/hospital" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Hospital</NavLink>
        </nav>
        <span className="screen-city">Santa Cruz · Simulación académica</span>
      </header>

      <main className="hospital-main">
        <aside className="hospital-sidebar">
          <p className="eyebrow sidebar-eyebrow">Notificaciones</p>
          <input
            type="email"
            className="notify-email-input"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="tu@correo.com"
            aria-label="Email de notificación"
            autoComplete="email"
          />
          <p className="eyebrow sidebar-eyebrow" style={{ marginTop: '1rem' }}>Ambulancias en camino</p>
          {MOCK_AMBULANCES.map((amb) => (
            <button
              key={amb.id}
              type="button"
              className={`amb-list-item${selected === amb.id ? ' amb-list-item--selected' : ''}`}
              onClick={() => setSelected(amb.id)}
            >
              <div className="amb-list-top">
                <strong>{amb.code}</strong>
                <span className="badge badge-green">{amb.etaMinutes} min</span>
              </div>
              <p className="amb-condition">{amb.condition}</p>
              <span className="amb-phase-label">{amb.phase}</span>
            </button>
          ))}
        </aside>

        <section className="hospital-detail">
          {selectedAmb && (
            <>
              <div className="card hosp-card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Ambulancia seleccionada</p>
                    <h2>{selectedAmb.code}</h2>
                  </div>
                  <span className="badge badge-green">{selectedAmb.etaMinutes} min ETA</span>
                </div>
                <p className="demo-note">Condición del paciente: {selectedAmb.condition}</p>
                <div className="quick-actions">
                  <button type="button" className="button button-secondary" disabled={sending}
                    onClick={() => void sendReply('Sala lista para recibir.')}>Sala lista</button>
                  <button type="button" className="button button-secondary" disabled={sending}
                    onClick={() => void sendReply('En preparación, esperen un momento.')}>En preparación</button>
                  <button type="button" className="button button-secondary" disabled={sending}
                    onClick={() => void sendReply('Confirmado. Los esperamos.')}>Confirmado</button>
                </div>
              </div>

              <div className="card hosp-card comm-panel">
                <p className="eyebrow">Comunicación</p>
                <h2>Log de mensajes</h2>
                {error && <div className="error-banner" role="alert">{error}</div>}
                {visibleMessages.length === 0 ? (
                  <p className="demo-note">Sin mensajes aún para esta ambulancia.</p>
                ) : (
                  <ul className="comm-list">
                    {visibleMessages.map((m) => (
                      <li key={m.id} className={`comm-item comm-item--${m.from}`}>
                        <span className="comm-time">
                          {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{m.from === 'ambulance' ? (m.ambulanceCode ?? selectedAmb.code) : 'Hospital'}
                          {m.isAudio ? ' 🎙️' : ''}
                        </span>
                        <p>{m.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="comm-reply">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escribí un mensaje para la ambulancia…"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(reply); }
                    }}
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={!reply.trim() || sending}
                    onClick={() => void sendReply(reply)}
                  >
                    <span>📤</span>Enviar
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
