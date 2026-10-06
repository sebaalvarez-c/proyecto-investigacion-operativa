import { useEffect, useRef } from 'react';
import type { RouteView } from '../../services/api';

type MapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => MapsMap;
    Marker: new (options: Record<string, unknown>) => MapsMarker;
    Polyline: new (options: Record<string, unknown>) => MapsPolyline;
  };
};
type MapsMap = { setCenter: (position: Coordinates) => void };
type MapsMarker = { setPosition: (position: Coordinates) => void };
type MapsPolyline = { setMap: (map: MapsMap | null) => void };
type Coordinates = { lat: number; lng: number };

declare global {
  interface Window { google?: MapsApi; }
}

const santaCruzCenter: Coordinates = { lat: -17.7804, lng: -63.1745 };
const incident: Coordinates = { lat: -17.7804, lng: -63.1745 };
const ambulanceStart: Coordinates = { lat: -17.773, lng: -63.17 };
const hospital: Coordinates = { lat: -17.7617, lng: -63.1656 };

let mapsLoader: Promise<MapsApi | null> | null = null;
function loadGoogleMaps(): Promise<MapsApi | null> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return Promise.resolve(null);
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise<MapsApi | null>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&v=weekly`;
    script.async = true;
    script.onload = () => resolve(window.google ?? null);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  }).catch((): MapsApi | null => null);
  return mapsLoader;
}

function GoogleMap({ arrived }: { arrived: boolean }) {
  const mapElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: number | undefined;
    let ambulanceMarker: MapsMarker | undefined;
    let map: MapsMap | undefined;
    loadGoogleMaps().then((api) => {
      if (!api || !mapElement.current) return;
      map = new api.maps.Map(mapElement.current, { center: santaCruzCenter, zoom: 13, mapId: 'DEMO_MAP_ID' });
      new api.maps.Marker({ map, position: incident, title: 'Accidente' });
      new api.maps.Marker({ map, position: hospital, title: 'Hospital Japonés' });
      ambulanceMarker = new api.maps.Marker({ map, position: arrived ? hospital : ambulanceStart, title: 'Ambulancia' });
      const route = new api.maps.Polyline({ map, path: [ambulanceStart, incident, hospital], geodesic: true, strokeColor: '#0c9e94', strokeOpacity: 0.9, strokeWeight: 5 });
      route.setMap(map);
      if (!arrived) {
        let progress = 0;
        timer = window.setInterval(() => {
          progress = Math.min(progress + 0.04, 1);
          ambulanceMarker?.setPosition({ lat: ambulanceStart.lat + (hospital.lat - ambulanceStart.lat) * progress, lng: ambulanceStart.lng + (hospital.lng - ambulanceStart.lng) * progress });
          if (progress >= 1 && timer) window.clearInterval(timer);
        }, 700);
      }
    });
    return () => { if (timer) window.clearInterval(timer); void map; };
  }, [arrived]);
  return <div ref={mapElement} className="map-canvas google-map-canvas" role="img" aria-label="Mapa de Google Maps de Santa Cruz con ambulancia en movimiento" />;
}

export function MapPanel({ route, arrived }: { route: RouteView | null; arrived: boolean }) {
  return (
    <section className="card map-card" aria-labelledby="map-title">
      <div className="section-heading"><div><p className="eyebrow">Seguimiento en vivo</p><h2 id="map-title">Ruta de la ambulancia</h2></div><span className={`status-dot ${arrived ? 'arrived' : 'moving'}`}>{arrived ? 'Llegó' : 'En camino'}</span></div>
      {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? <GoogleMap arrived={arrived} /> : <div className="map-canvas" role="img" aria-label="Mapa simulado de Santa Cruz con ambulancia en movimiento"><div className="map-grid" /><div className="route-line" /><div className="map-marker incident-marker"><span>●</span><small>Accidente</small></div><div className={`map-marker ambulance-marker ${arrived ? 'arrived' : ''}`}><span>✚</span><small>Ambulancia</small></div><div className="map-marker hospital-marker"><span>✚</span><small>Hospital</small></div><div className="map-label">Santa Cruz de la Sierra</div></div>}
      <div className="route-summary"><div><span className="route-icon">↗</span><span>Ruta principal</span><strong>{route ? `${route.primary.estimatedMinutes} min` : '—'}</strong></div>{route?.alternative && <div className="alternative-route"><span className="route-icon">⇄</span><span>Alternativa por bloqueo</span><strong>{route.alternative.estimatedMinutes} min</strong></div>}</div>
    </section>
  );
}
