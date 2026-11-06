import { useEffect, useState } from 'react';
import { EmergencyForm } from './features/emergency/EmergencyForm';
import { MapPanel } from './features/map/MapPanel';
import { locationFromGeolocation, type GeoPoint } from './features/map/map-utils';
import { TransportMatrixCard } from './features/transport-matrix/TransportMatrixCard';
import { createEmergency, getHospitals, getAmbulanceOptions, chooseAmbulance, completeDispatch, type Hospital, type AmbulanceOption, type Dispatch } from './services/api';
import './App.css';

const initialLocation = { latitude: -17.7804, longitude: -63.1745 };
type Phase = 'idle' | 'pickup' | 'at-incident' | 'transfer' | 'arrived';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [options, setOptions] = useState<AmbulanceOption[] | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'price'>('time');
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [userLocation, setUserLocation] = useState<GeoPoint>(initialLocation);
  const [locationMode, setLocationMode] = useState<'simulated' | 'current' | 'loading' | 'error'>('simulated');

  useEffect(() => { getHospitals().then(setHospitals).catch(() => setError('No se pudo cargar la lista de hospitales. Revisa que el backend esté encendido.')); }, []);
  useEffect(() => {
    if (phase !== 'at-incident') return;
    const timer = window.setTimeout(() => setPhase('transfer'), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function handleLocate() {
    if (!navigator.geolocation) { setLocationMode('error'); return; }
    setLocationMode('loading');
    navigator.geolocation.getCurrentPosition((position) => { setUserLocation(locationFromGeolocation(position)); setLocationMode('current'); }, () => setLocationMode('error'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }
  async function handleEmergency(description: string) {
    setLoading(true); setError(null); setOptions(null); setDispatch(null); setPhase('idle');
    try {
      const emergency = await createEmergency({ description, ...userLocation });
      setEmergencyId(emergency.id);
      setOptions(await getAmbulanceOptions(emergency.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron buscar ambulancias.'); }
    finally { setLoading(false); }
  }
  async function handleChoice(ambulanceId: string) {
    if (!emergencyId) return;
    setLoading(true); setError(null);
    try { const selected = await chooseAmbulance(emergencyId, ambulanceId); setDispatch(selected); setPhase('pickup'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo asignar la ambulancia.'); }
    finally { setLoading(false); }
  }
  function handleLegComplete() {
    if (phase === 'pickup') setPhase('at-incident');
    if (phase === 'transfer') {
      setPhase('arrived');
      if (emergencyId) completeDispatch(emergencyId).catch(() => setError('El traslado terminó, pero no se pudo liberar la ambulancia simulada.'));
    }
  }
  const sorted = [...(options ?? [])].sort((a, b) => sortBy === 'price' ? a.priceBs - b.priceBs : a.estimatedMinutes - b.estimatedMinutes);
  const nearest = options?.reduce((best, item) => item.estimatedMinutes < best.estimatedMinutes ? item : best, options[0]);
  const cheapest = options?.reduce((best, item) => item.priceBs < best.priceBs ? item : best, options[0]);
  const activeRoute = dispatch ? (phase === 'transfer' || phase === 'arrived' ? dispatch.transfer : dispatch.pickup) : null;
  const inProgress = phase !== 'idle' && phase !== 'arrived';
  const arrivalTime = (minutes: number) => new Date(Date.now() + minutes * 60_000).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  return <div className="app-shell"><header className="topbar"><a className="brand" href="/" aria-label="Ambulance Transport inicio"><span className="brand-mark">✚</span><span>AMBULANCE<span>TRANSPORT</span></span></a><div className="header-meta"><span className="live-pill"><i /> Simulación académica</span><span className="location-pill">Santa Cruz, BO</span></div></header><main><section className="hero-copy"><div><p className="eyebrow">Centro de despacho · Investigación operativa</p><h1>La ruta más rápida<br /><em>cuando cada minuto importa.</em></h1><p className="hero-lede">Compara ambulancias, precios de demostración y tiempos estimados. Luego sigue su recorrido hasta el hospital.</p></div><div className="hero-stat"><strong>01</strong><span>escenario<br />académico</span></div></section><div className="workflow-grid"><div className="left-column"><EmergencyForm loading={loading || inProgress} location={userLocation} locationMode={locationMode} onLocate={handleLocate} onSubmit={handleEmergency} />{loading && <div className="search-notice" role="status">{options ? 'Preparando el despacho…' : 'Buscando ambulancias…'}</div>}{error && <div className="error-banner" role="alert"><strong>No se pudo completar</strong><span>{error}</span></div>}{options && !dispatch && <section className="card options-card"><div className="section-heading"><div><p className="eyebrow">Paso 2 · Elige una unidad</p><h2>Ambulancias disponibles</h2></div><span className="badge badge-green">{options.length} disponibles</span></div><p className="demo-note">Tarifas estimadas en Bs para esta demostración. No se realizará ningún cobro.</p>{options.length > 0 ? <><label htmlFor="sort-options">Ordenar por</label><select id="sort-options" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'time' | 'price')}><option value="time">Menor tiempo</option><option value="price">Menor precio</option></select><div className="ambulance-options">{sorted.map((item) => <article className="ambulance-option" key={item.id}><div className="option-top"><strong>{item.code}</strong><div>{item.id === nearest?.id && <span className="badge badge-green">Más cercana</span>} {item.id === cheapest?.id && <span className="badge badge-green">Más económica</span>}</div></div><p>{item.hospital.name}</p><div className="option-metrics"><span>⏱ {item.estimatedMinutes} min <small>llegada aprox. {arrivalTime(item.estimatedMinutes)}</small></span><span>⌖ {(item.distanceMeters / 1000).toFixed(1)} km</span><strong>Bs {item.priceBs.toFixed(2)}</strong></div><button className="button button-secondary" type="button" disabled={loading} onClick={() => handleChoice(item.id)}>Elegir ambulancia</button></article>)}</div></> : <p>No hay ambulancias disponibles cercanas. Intenta nuevamente.</p>}</section>}{dispatch && <><section className="card options-card"><p className="eyebrow">Tu elección</p><h2>{dispatch.ambulance.code} · Bs {dispatch.priceBs.toFixed(2)}</h2><p className="demo-note">Origen: {dispatch.base.name} · Destino recomendado: {dispatch.hospital.name}</p><p className="demo-note">{phase === 'pickup' ? 'La ambulancia se dirige al incidente.' : phase === 'at-incident' ? 'La ambulancia llegó al incidente.' : phase === 'transfer' ? 'Traslado en camino al hospital.' : 'Llegó al hospital. Simulación terminada.'}</p></section><TransportMatrixCard solution={dispatch.solution} /></>}</div><div className="right-column"><MapPanel route={activeRoute} userLocation={userLocation} hospitals={hospitals} phase={phase} onLegComplete={handleLegComplete} /></div></div></main><footer><span>Proyecto de Investigación Operativa</span><span>Método de transporte · PWA demostrativa</span></footer></div>;
}

export default App;
