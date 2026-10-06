import { useState } from 'react';
import { EmergencyForm } from './features/emergency/EmergencyForm';
import { MapPanel } from './features/map/MapPanel';
import { TrackingStatus } from './features/tracking/TrackingStatus';
import { useAmbulanceTracking } from './features/tracking/useAmbulanceTracking';
import { TransportMatrixCard } from './features/transport-matrix/TransportMatrixCard';
import { createEmergency, getRoute, optimizeEmergency, type RouteView, type TransportSolutionView } from './services/api';
import './App.css';

const incidentLocation = { latitude: -17.7804, longitude: -63.1745 };

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<TransportSolutionView | null>(null);
  const [route, setRoute] = useState<RouteView | null>(null);
  const [arrived, setArrived] = useState(false);
  const tracking = useAmbulanceTracking(solution?.assignment.originId);

  async function handleEmergency(description: string) {
    setLoading(true); setError(null); setArrived(false);
    try {
      const emergency = await createEmergency({ description, ...incidentLocation });
      const nextSolution = await optimizeEmergency(emergency.id);
      setSolution(nextSolution);
      setRoute(await getRoute(emergency.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar el accidente.');
    } finally { setLoading(false); }
  }

  return (
    <div className="app-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="Ambulance Transport inicio"><span className="brand-mark">✚</span><span>AMBULANCE<span>TRANSPORT</span></span></a><div className="header-meta"><span className="live-pill"><i /> Simulación activa</span><span className="location-pill">Santa Cruz, BO</span></div></header>
      <main>
        <section className="hero-copy"><div><p className="eyebrow">Centro de despacho · Investigación operativa</p><h1>La ruta más rápida<br /><em>cuando cada minuto importa.</em></h1><p className="hero-lede">Simula un despacho de ambulancia, compara alternativas con el método de transporte y sigue la unidad hasta el hospital.</p></div><div className="hero-stat"><strong>01</strong><span>escenario<br />académico</span></div></section>
        <div className="workflow-grid"><div className="left-column"><EmergencyForm loading={loading} onSubmit={handleEmergency} />{error && <div className="error-banner" role="alert"><strong>No se pudo completar</strong><span>{error}</span></div>}{solution && <TransportMatrixCard solution={solution} />}</div><div className="right-column">{route ? <MapPanel route={route} arrived={arrived || tracking.connection === 'arrived'} /> : <section className="card map-card map-empty"><div className="empty-map-icon">⌁</div><h2>Mapa de despacho</h2><p>Reporta un accidente para calcular la asignación y visualizar la ruta.</p><div className="map-empty-grid" /></section>}{route && <TrackingStatus arrived={arrived} connection={tracking.connection} onArrive={() => setArrived(true)} />}</div></div>
      </main>
      <footer><span>Proyecto de Investigación Operativa</span><span>Método de transporte · PWA demostrativa</span></footer>
    </div>
  );
}

export default App;
