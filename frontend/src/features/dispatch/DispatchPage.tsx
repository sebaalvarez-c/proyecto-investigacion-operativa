import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { EmergencyForm } from '../emergency/EmergencyForm';
import { MapPanel } from '../map/MapPanel';
import { locationFromGeolocation, type GeoPoint } from '../map/map-utils';
import { TransportMatrixCard } from '../transport-matrix/TransportMatrixCard';
import { TransportSimulation } from '../transport-matrix/TransportSimulation';
import { createEmergency, getHospitals, getAmbulanceOptions, chooseAmbulance, completeDispatch, type Hospital, type AmbulanceOption, type Dispatch } from '../../services/api';

const initialLocation = { latitude: -17.7804, longitude: -63.1745 };
type Phase = 'idle' | 'pickup' | 'at-incident' | 'transfer' | 'arrived';

function userFacingError(cause: unknown, fallback: string) {
  if (cause instanceof TypeError && /fetch/i.test(cause.message)) {
    return 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.';
  }
  return cause instanceof Error ? cause.message : fallback;
}

export function DispatchPage() {
  const [multiple, setMultiple] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const locationRequest = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [options, setOptions] = useState<AmbulanceOption[] | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'price'>('time');
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [userLocation, setUserLocation] = useState<GeoPoint>(initialLocation);
  const [locationMode, setLocationMode] = useState<'simulated' | 'map' | 'current' | 'loading' | 'error'>('simulated');
  const [clock] = useState(() => Date.now());
  const [sessionEmergencies, setSessionEmergencies] = useState(0);
  const [sessionCostBs, setSessionCostBs] = useState(0);
  const [sessionDispatches, setSessionDispatches] = useState(0);

  useEffect(() => { getHospitals().then(setHospitals).catch((cause) => setError(userFacingError(cause, 'No se pudo cargar la lista de hospitales.'))); }, []);
  useEffect(() => {
    if (phase !== 'at-incident') return;
    const timer = window.setTimeout(() => setPhase('transfer'), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function updateLocation(point: GeoPoint, mode: 'map' | 'current') {
    locationRequest.current += 1;
    setUserLocation(point);
    setLocationMode(mode);
    setEmergencyId(null);
    setOptions(null);
    setDispatch(null);
    setPhase('idle');
    setError(null);
  }
  function handleLocate() {
    if (!navigator.geolocation) { setLocationMode('error'); return; }
    setLocationMode('loading');
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition((position) => {
      if (locationRequest.current === request) updateLocation(locationFromGeolocation(position), 'current');
    }, () => { if (locationRequest.current === request) setLocationMode('error'); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }
  async function handleEmergency(description: string) {
    setEditing(false);
    setShowMatrix(false);
    setLoading(true); setError(null); setOptions(null); setDispatch(null); setPhase('idle');
    try {
      const emergency = await createEmergency({ description, ...userLocation });
      setEmergencyId(emergency.id);
      setOptions(await getAmbulanceOptions(emergency.id));
      setSessionEmergencies(n => n + 1);
    } catch (cause) { setError(userFacingError(cause, 'No se pudieron buscar ambulancias.')); }
    finally { setLoading(false); }
  }
  async function handleChoice(ambulanceId: string) {
    if (!emergencyId) return;
    setLoading(true); setError(null);
    try {
      const selected = await chooseAmbulance(emergencyId, ambulanceId);
      setDispatch(selected);
      setPhase('pickup');
      setSessionCostBs(c => c + selected.priceBs);
      setSessionDispatches(d => d + 1);
    }
    catch (cause) { setError(userFacingError(cause, 'No se pudo asignar la ambulancia.')); }
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
  const arrivalTime = (minutes: number) => new Date(clock + minutes * 60_000).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="app-shell dispatch-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="EmergIA inicio"><span className="brand-mark">✚</span><span>EmergIA<span>Despacho</span></span></a>
        <nav className="screen-tabs" aria-label="Modo de simulación">
          <button type="button" aria-pressed={!multiple} onClick={() => setMultiple(false)}>Un incidente</button>
          <button type="button" aria-pressed={multiple} disabled={inProgress || loading} onClick={() => setMultiple(true)}>Múltiples incidentes</button>
        </nav>
        <nav className="page-nav" aria-label="Vistas">
          <NavLink to="/dispatch" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Despacho</NavLink>
          <NavLink to="/ambulance" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Ambulancia</NavLink>
          <NavLink to="/hospital" className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}>Hospital</NavLink>
        </nav>
      </header>
      <main>
        {multiple ? <TransportSimulation /> : (
          <div className="dispatch-workspace">
            <MapPanel route={activeRoute} userLocation={userLocation} hospitals={hospitals} phase={phase}
              onLegComplete={handleLegComplete} onPick={loading || inProgress ? undefined : (point) => updateLocation(point, 'map')} />
            <aside className="dispatch-sheet" aria-label="Panel de incidente">
              {(options || dispatch) && (
                <nav className="screen-tabs" aria-label="Incidente">
                  <button type="button" aria-pressed={editing} onClick={() => setEditing(true)}>Ubicación</button>
                  <button type="button" aria-pressed={!editing && !showMatrix} onClick={() => { setEditing(false); setShowMatrix(false); }}>{dispatch ? 'Viaje' : 'Ambulancias'}</button>
                  {dispatch && <button type="button" aria-pressed={!editing && showMatrix} onClick={() => { setEditing(false); setShowMatrix(true); }}>Matriz</button>}
                </nav>
              )}
              {error && <div className="error-banner" role="alert">{error}</div>}
              <ol className="flow-steps" aria-label="Pasos del despacho">
                <li className="done"><span>1</span><strong>Ubica el incidente</strong></li>
                <li className={options ? 'done' : ''}><span>2</span><strong>Compara ambulancias</strong></li>
                <li className={dispatch ? 'done' : ''}><span>3</span><strong>Sigue el traslado</strong></li>
              </ol>
              {sessionDispatches > 0 && (
                <div className="metrics-bar">
                  <span className="metric-chip"><strong>{sessionEmergencies}</strong> emergencias</span>
                  <span className="metric-chip"><strong>Bs {sessionCostBs.toFixed(0)}</strong> optimizados</span>
                  <span className="metric-chip"><strong>{sessionDispatches}</strong> despachos</span>
                </div>
              )}
              <p className="screen-status" role="status">
                {loading ? (options ? 'Preparando el despacho…' : 'Buscando ambulancias…')
                  : phase === 'pickup' ? 'Ambulancia en camino al incidente'
                  : phase === 'at-incident' ? 'Ambulancia llegó al incidente'
                  : phase === 'transfer' ? 'Traslado en camino al hospital'
                  : phase === 'arrived' ? 'Llegó al hospital'
                  : options ? 'Elige la ambulancia que prefieras'
                  : 'Listo para buscar ambulancias'}
              </p>
              <div className="sheet-content" hidden={!(editing || (!options && !dispatch))}>
                <EmergencyForm loading={loading || inProgress} location={userLocation} locationMode={locationMode} onLocate={handleLocate} onSubmit={handleEmergency} />
              </div>
              {!editing && <div className="sheet-content" hidden={!options && !dispatch}>
                {options && !dispatch && (
                  <section className="card options-card">
                    <div className="section-heading">
                      <h2>Ambulancias disponibles</h2>
                      <span className="badge badge-green">{options.length}</span>
                    </div>
                    <p className="demo-note tariff-note">Tarifa académica estimada · no es un cobro real</p>
                    {options.length ? <>
                      <select aria-label="Ordenar ambulancias" value={sortBy} onChange={(event) => {
                        setSortBy(event.target.value as 'time' | 'price');
                      }}>
                        <option value="time">Ordenar por tiempo</option>
                        <option value="price">Ordenar por precio</option>
                      </select>
                      <div className="ambulance-options">
                        {sorted.map((item) => (
                          <article className="ambulance-option" key={item.id}>
                            <div className="option-top"><strong>{item.code}</strong></div>
                            {item.id === nearest?.id && <span className="option-tag">Más cercana</span>}
                            {item.id === cheapest?.id && <span className="option-tag">Más económica</span>}
                            <p>{item.hospital.name}</p>
                            <div className="option-metrics">
                              <span>{item.estimatedMinutes} min · {(item.distanceMeters / 1000).toFixed(1)} km</span>
                              <strong>Bs {item.priceBs.toFixed(2)}</strong>
                            </div>
                            <small className="option-arrival">Llegada aprox. {arrivalTime(item.estimatedMinutes)}</small>
                            <button className="button button-secondary" type="button" disabled={loading}
                              onClick={() => handleChoice(item.id)}>Elegir ambulancia</button>
                          </article>
                        ))}
                      </div>
                    </> : <p>No hay ambulancias disponibles cercanas. Intenta nuevamente.</p>}
                  </section>
                )}
                {dispatch && !showMatrix && <section className="card options-card"><p className="eyebrow">Tu elección</p><h2>{dispatch.ambulance.code} · Bs {dispatch.priceBs.toFixed(2)}</h2><p className="demo-note">Origen: {dispatch.base.name} · Destino recomendado: {dispatch.hospital.name}</p><p className="demo-note">{phase === 'pickup' ? 'La ambulancia se dirige al incidente.' : phase === 'at-incident' ? 'La ambulancia llegó al incidente.' : phase === 'transfer' ? 'Traslado en camino al hospital.' : 'Llegó al hospital. Simulación terminada.'}</p></section>}{dispatch && showMatrix && <TransportMatrixCard solution={dispatch.solution} />}
              </div>}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
