import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllMessages, sendMessage, getActiveDispatches, type CommunicationMessage, type ActiveDispatch } from '../../services/api';
import { useRecipientEmail } from '../../hooks/useRecipientEmail';

const POLL_INTERVAL_MS = 5000;

function fmtEta(s: number) {
  if (s <= 0) return 'Llegando…';
  const m = Math.floor(s / 60), r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${s}s`;
}

export function HospitalPage() {
  const [recipientEmail, setRecipientEmail] = useRecipientEmail();
  const [ambulances, setAmbulances] = useState<ActiveDispatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [etaMap, setEtaMap] = useState<Map<string, number>>(new Map());
  const dispatchSeenRef = useRef<Map<string, { at: number; initialSecs: number }>>(new Map());
  const prevAmbMsgsRef = useRef<Record<string, number>>({});

  const selectedAmb = ambulances.find((a) => a.emergencyId === selectedId) ?? ambulances[0] ?? null;

  useEffect(() => {
    void loadAll();
    const interval = setInterval(() => void loadAll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ETA countdown per ambulance
  useEffect(() => {
    ambulances.forEach((amb) => {
      if (!dispatchSeenRef.current.has(amb.emergencyId)) {
        dispatchSeenRef.current.set(amb.emergencyId, {
          at: Date.now(),
          initialSecs: Math.round(amb.etaPickupMinutes * 60),
        });
      }
    });
    for (const id of dispatchSeenRef.current.keys()) {
      if (!ambulances.find((a) => a.emergencyId === id)) dispatchSeenRef.current.delete(id);
    }
  }, [ambulances]);

  useEffect(() => {
    if (ambulances.length === 0) { setEtaMap(new Map()); return; }
    const tick = () => {
      const now = Date.now();
      const next = new Map<string, number>();
      for (const [id, info] of dispatchSeenRef.current) {
        next.set(id, Math.max(0, info.initialSecs - Math.round((now - info.at) / 1000)));
      }
      setEtaMap(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ambulances.length]);

  // Toast when new ambulance messages arrive
  useEffect(() => {
    if (!selectedAmb) return;
    const ambMsgs = messages.filter((m) => m.from === 'ambulance' && m.emergencyId === selectedAmb.emergencyId);
    const prev = prevAmbMsgsRef.current[selectedAmb.emergencyId] ?? 0;
    if (ambMsgs.length > prev && prev > 0) {
      const latest = ambMsgs[ambMsgs.length - 1];
      const code = latest.ambulanceCode ?? selectedAmb.ambulanceCode;
      const preview = latest.text.length > 55 ? latest.text.slice(0, 55) + '…' : latest.text;
      setToast(`📡 ${code}: ${preview}`);
    }
    prevAmbMsgsRef.current[selectedAmb.emergencyId] = ambMsgs.length;
  }, [messages, selectedAmb?.emergencyId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  async function loadAll() {
    try {
      const [dispatches, msgs] = await Promise.all([getActiveDispatches(), getAllMessages()]);
      setAmbulances(dispatches);
      setMessages(msgs);
      if (dispatches.length > 0) {
        setSelectedId((prev) => prev ?? dispatches[0].emergencyId);
      }
    } catch {
      // silent — keep existing state
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
      void loadAll();
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
      {toast && (
        <div className="toast-notification" role="alert">
          {toast}
          <button className="toast-close" onClick={() => setToast(null)} aria-label="Cerrar">×</button>
        </div>
      )}
      <header className="topbar">
        <a className="brand" href="/" aria-label="EmergIA inicio">
          <span className="brand-mark">✚</span>
          <span>EmergIA<span>Hospital</span></span>
        </a>
        <nav className="page-nav" aria-label="Vistas">
          <NavLink to="/dispatch" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Despacho</NavLink>
          <NavLink to="/ambulance" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Ambulancia</NavLink>
          <NavLink to="/hospital" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Hospital</NavLink>
        </nav>
        <span className="screen-city">Santa Cruz · Simulación académica</span>
      </header>

      <main className="hospital-main">
        <aside className="hospital-sidebar">
          <p className="eyebrow sidebar-eyebrow">Notificaciones</p>
          <p className="demo-note" style={{ fontSize: '.75rem', marginBottom: '.4rem' }}>Correo de este dispositivo para recibir alertas.</p>
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
          {ambulances.length === 0 ? (
            <p className="demo-note" style={{ fontSize: '.8rem', marginTop: '.5rem' }}>Sin ambulancias activas.</p>
          ) : (
            ambulances.map((amb) => (
              <button
                key={amb.emergencyId}
                type="button"
                className={`amb-list-item${selectedAmb?.emergencyId === amb.emergencyId ? ' amb-list-item--selected' : ''}`}
                onClick={() => setSelectedId(amb.emergencyId)}
              >
                <div className="amb-list-top">
                  <strong>{amb.ambulanceCode}</strong>
                  <span className={`badge badge-green eta-countdown${(etaMap.get(amb.emergencyId) ?? 1) === 0 ? ' eta-arriving' : ''}`}>
                    {fmtEta(etaMap.get(amb.emergencyId) ?? Math.round(amb.etaPickupMinutes * 60))}
                  </span>
                </div>
                <p className="amb-condition">{amb.emergencyDescription}</p>
                <span className="amb-phase-label">En camino</span>
              </button>
            ))
          )}
        </aside>

        <section className="hospital-detail">
          {selectedAmb ? (
            <>
              <div className="card hosp-card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Ambulancia seleccionada</p>
                    <h2>{selectedAmb.ambulanceCode}</h2>
                  </div>
                  <span className={`badge badge-green eta-countdown${(etaMap.get(selectedAmb.emergencyId) ?? 1) === 0 ? ' eta-arriving' : ''}`}>
                    {fmtEta(etaMap.get(selectedAmb.emergencyId) ?? Math.round(selectedAmb.etaPickupMinutes * 60))} ETA
                  </span>
                </div>
                <p className="demo-note">Condición del paciente: {selectedAmb.emergencyDescription}</p>
                <p className="demo-note" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                  Destino: {selectedAmb.hospitalName}
                </p>
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
                          {' · '}{m.from === 'ambulance' ? (m.ambulanceCode ?? selectedAmb.ambulanceCode) : 'Hospital'}
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
          ) : (
            <div className="card hosp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <p className="demo-note" style={{ textAlign: 'center' }}>
                Sin despacho activo.<br />
                <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Las ambulancias aparecerán aquí cuando se despache una emergencia.</span>
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
