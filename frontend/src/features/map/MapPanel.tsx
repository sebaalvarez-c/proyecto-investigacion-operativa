import type { RouteView } from '../../services/api';

export function MapPanel({ route, arrived }: { route: RouteView | null; arrived: boolean }) {
  return (
    <section className="card map-card" aria-labelledby="map-title">
      <div className="section-heading"><div><p className="eyebrow">Seguimiento en vivo</p><h2 id="map-title">Ruta de la ambulancia</h2></div><span className={`status-dot ${arrived ? 'arrived' : 'moving'}`}>{arrived ? 'Llegó' : 'En camino'}</span></div>
      <div className="map-canvas" role="img" aria-label="Mapa simulado de Santa Cruz con ambulancia en movimiento"><div className="map-grid" /><div className="route-line" /><div className="map-marker incident-marker"><span>●</span><small>Accidente</small></div><div className={`map-marker ambulance-marker ${arrived ? 'arrived' : ''}`}><span>✚</span><small>Ambulancia</small></div><div className="map-marker hospital-marker"><span>✚</span><small>Hospital</small></div><div className="map-label">Santa Cruz de la Sierra</div></div>
      <div className="route-summary"><div><span className="route-icon">↗</span><span>Ruta principal</span><strong>{route ? `${route.primary.estimatedMinutes} min` : '—'}</strong></div>{route?.alternative && <div className="alternative-route"><span className="route-icon">⇄</span><span>Alternativa por bloqueo</span><strong>{route.alternative.estimatedMinutes} min</strong></div>}</div>
    </section>
  );
}
