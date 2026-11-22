import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllMessages, sendMessage, transcribeAudio, type CommunicationMessage } from '../../services/api';
import { useRecipientEmail } from '../../hooks/useRecipientEmail';

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

const MOCK_DISPATCH = {
  emergencyId: 'demo-emergency',
  code: 'AMB-003',
  address: 'Av. Monseñor Rivero y 2do Anillo',
  hospitalName: 'Hospital San Juan de Dios',
  etaMinutes: 6,
  phase: 'En camino al incidente',
};

const POLL_INTERVAL_MS = 5000;

export function AmbulancePage() {
  const [recipientEmail, setRecipientEmail] = useRecipientEmail();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function loadMessages() {
    try {
      const all = await getAllMessages();
      setMessages(all.filter((m) => m.from === 'hospital'));
    } catch {
      // silent — keep existing messages
    }
  }

  async function toggleRecording() {
    if (recordingState === 'recording') {
      mediaRef.current?.stop();
      return;
    }
    setError(null);
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void processAudio(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      mediaRef.current = mr;
      mr.start();
      setRecordingState('recording');
    } catch {
      setError('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  }

  async function processAudio(blob: Blob) {
    setRecordingState('processing');
    try {
      const base64 = await blobToBase64(blob);
      const { text } = await transcribeAudio(base64, blob.type || 'audio/webm');
      setTranscript(text);
      setRecordingState('done');
    } catch {
      setError('No se pudo transcribir el audio. Intentá de nuevo.');
      setRecordingState('idle');
    }
  }

  async function sendToHospital() {
    if (!transcript) return;
    try {
      await sendMessage({
        emergencyId: MOCK_DISPATCH.emergencyId,
        from: 'ambulance',
        text: transcript,
        isAudio: true,
        ambulanceCode: MOCK_DISPATCH.code,
        recipientEmail: recipientEmail || undefined,
      });
      setTranscript('');
      setRecordingState('idle');
      void loadMessages();
    } catch {
      setError('No se pudo enviar el mensaje. Intentá de nuevo.');
    }
  }

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

      <main className="ambulance-main">
        <section className="card amb-card">
          <p className="eyebrow">Despacho activo</p>
          <div className="amb-status-row">
            <span className="amb-unit">{MOCK_DISPATCH.code}</span>
            <span className="badge badge-green">{MOCK_DISPATCH.phase}</span>
          </div>
          <div className="amb-detail">
            <div className="amb-detail-row">
              <span className="amb-label">Incidente</span>
              <strong>{MOCK_DISPATCH.address}</strong>
            </div>
            <div className="amb-detail-row">
              <span className="amb-label">Hospital destino</span>
              <strong>{MOCK_DISPATCH.hospitalName}</strong>
            </div>
            <div className="amb-detail-row amb-eta-row">
              <span className="amb-label">ETA estimado</span>
              <strong className="eta-value">{MOCK_DISPATCH.etaMinutes} min</strong>
            </div>
          </div>
        </section>

        <section className="card amb-card">
          <p className="eyebrow">Notificaciones</p>
          <h2>Email de alerta</h2>
          <p className="demo-note">
            Ingresá el correo de este dispositivo para recibir alertas de emergencia.
          </p>
          <input
            type="email"
            className="notify-email-input"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="tu@correo.com"
            aria-label="Email de notificación"
            autoComplete="email"
          />
        </section>

        <section className="card amb-card">
          <p className="eyebrow">Comunicar al hospital</p>
          <h2>Enviar audio</h2>
          <p className="demo-note">
            Grabá tu mensaje — se transcribe automáticamente y llega al hospital.
          </p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="record-area">
            <button
              type="button"
              className={`record-btn${recordingState === 'recording' ? ' record-btn--active' : ''}`}
              onClick={toggleRecording}
              disabled={recordingState === 'processing'}
              aria-label={recordingState === 'recording' ? 'Detener grabación' : 'Iniciar grabación'}
            >
              <span className="record-btn-icon">
                {recordingState === 'recording' ? '⏹' : recordingState === 'processing' ? '⏳' : '🎙️'}
              </span>
              <span>
                {recordingState === 'recording' ? 'Grabando…' : recordingState === 'processing' ? 'Transcribiendo…' : 'Grabar mensaje'}
              </span>
            </button>
          </div>
          {transcript && (
            <div className="transcript-box">
              <span className="amb-label">Transcripción</span>
              <p>{transcript}</p>
              <button type="button" className="button button-primary" onClick={() => void sendToHospital()}>
                <span>📤</span>Enviar al hospital
              </button>
            </div>
          )}
        </section>

        <section className="card amb-card">
          <p className="eyebrow">Del hospital</p>
          <h2>Mensajes recibidos</h2>
          {messages.length === 0 ? (
            <p className="demo-note">Sin mensajes aún.</p>
          ) : (
            <ul className="comm-list">
              {messages.map((m) => (
                <li key={m.id} className="comm-item comm-item--hospital">
                  <span className="comm-time">
                    {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} · Hospital
                  </span>
                  <p>{m.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
