import { useEffect, useRef, useState } from 'react';
import type { RouteView } from '../../services/api';
import { decodeEncodedPolyline, interpolatePoint, type GeoPoint } from './map-utils';

type Coordinates = { lat: number; lng: number };
type MapsBounds = { extend: (position: Coordinates) => void };
type MapsMap = { fitBounds: (bounds: MapsBounds, padding?: number) => void };
type MapsMarker = { setPosition: (position: Coordinates) => void };
type MapsPolyline = { setMap: (map: MapsMap | null) => void };
type MapsApi = { maps: { Map: new (element: HTMLElement, options: Record<string, unknown>) => MapsMap; Marker: new (options: Record<string, unknown>) => MapsMarker; Polyline: new (options: Record<string, unknown>) => MapsPolyline; LatLngBounds: new () => MapsBounds } };
declare global { interface Window { google?: MapsApi; } }

const ambulanceStart: GeoPoint = { latitude: -17.773, longitude: -63.17 };
const hospital: GeoPoint = { latitude: -17.7617, longitude: -63.1656 };
let mapsLoader: Promise<MapsApi | null> | null = null;
function loadGoogleMaps(): Promise<MapsApi | null> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return Promise.resolve(null);
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise<MapsApi | null>((resolve, reject) => { const script = document.createElement('script'); script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&v=weekly`; script.async = true; script.onload = () => resolve(window.google ?? null); script.onerror = () => reject(new Error('No se pudo cargar Google Maps')); document.head.appendChild(script); }).catch(() => null);
  return mapsLoader;
}
function svgIcon(background: string, glyph: string): string { return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="${background}" stroke="white" stroke-width="4"/><text x="24" y="31" fill="white" text-anchor="middle" font-size="20" font-family="Arial">${glyph}</text></svg>`)}`; }
function toCoordinates(point: GeoPoint): Coordinates { return { lat: point.latitude, lng: point.longitude }; }
function routePoints(polyline: string | undefined, fallback: GeoPoint[]): GeoPoint[] { const decoded = polyline ? decodeEncodedPolyline(polyline) : []; return decoded.length > 1 ? decoded : fallback; }

function GoogleMap({ arrived, userLocation, route, selectedIndex }: { arrived: boolean; userLocation: GeoPoint; route: RouteView; selectedIndex: number }) {
  const mapElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: number | undefined; let ambulanceMarker: MapsMarker | undefined;
    loadGoogleMaps().then((api) => {
      if (!api || !mapElement.current) return;
      const fallbackPath = [ambulanceStart, userLocation, hospital];
      const options = [route.primary, ...(route.alternatives ?? [])];
      const selected = options[selectedIndex] ?? options[0];
      const selectedPath = routePoints(selected?.polyline, fallbackPath);
      const map = new api.maps.Map(mapElement.current, { center: toCoordinates(userLocation), zoom: 12, gestureHandling: 'greedy', streetViewControl: false, mapTypeControl: false, fullscreenControl: true });
      const bounds = new api.maps.LatLngBounds();
      [...fallbackPath, ...selectedPath].forEach((point) => bounds.extend(toCoordinates(point))); map.fitBounds(bounds, 48);
      new api.maps.Marker({ map, position: toCoordinates(userLocation), title: 'Tu ubicación', icon: svgIcon('#4285f4', '●') });
      new api.maps.Marker({ map, position: toCoordinates(userLocation), title: 'Accidente', icon: svgIcon('#ee865f', '!') });
      new api.maps.Marker({ map, position: toCoordinates(hospital), title: 'Hospital Japonés', icon: svgIcon('#4f83c2', '+') });
      ambulanceMarker = new api.maps.Marker({ map, position: toCoordinates(arrived ? hospital : selectedPath[0]), title: 'Ambulancia', icon: svgIcon('#0c9e94', '✚') });
      options.forEach((option, index) => { const path = routePoints(option.polyline, fallbackPath); const line = new api.maps.Polyline({ map, path: path.map(toCoordinates), geodesic: false, strokeColor: index === selectedIndex ? '#0c9e94' : '#ee865f', strokeOpacity: index === selectedIndex ? 0.95 : 0.7, strokeWeight: index === selectedIndex ? 6 : 3 }); line.setMap(map); });
      if (!arrived) { let progress = 0; timer = window.setInterval(() => { progress = Math.min(progress + 0.025, 1); const scaled = progress * (selectedPath.length - 1); const segment = Math.min(Math.floor(scaled), selectedPath.length - 2); ambulanceMarker?.setPosition(toCoordinates(interpolatePoint(selectedPath[segment], selectedPath[segment + 1], scaled - segment))); if (progress >= 1 && timer) window.clearInterval(timer); }, 180); }
    });
    return () => { if (timer) window.clearInterval(timer); };
  }, [arrived, route, selectedIndex, userLocation]);
  return <div ref={mapElement} className="map-canvas google-map-canvas" role="img" aria-label="Mapa de Google Maps de Santa Cruz con rutas por calles y ambulancia en movimiento" />;
}

function SimulatedMap({ arrived }: { arrived: boolean }) { return <div className="map-canvas" role="img" aria-label="Mapa simulado de Santa Cruz con ambulancia en movimiento"><div className="map-grid" /><div className="route-line" /><div className="map-marker incident-marker"><span>●</span><small>Accidente</small></div><div className={`map-marker ambulance-marker ${arrived ? 'arrived' : ''}`}><span>✚</span><small>Ambulancia</small></div><div className="map-marker hospital-marker"><span>✚</span><small>Hospital</small></div><div className="map-label">Santa Cruz de la Sierra</div></div>; }

export function MapPanel({ route, userLocation, arrived }: { route: RouteView | null; userLocation: GeoPoint; arrived: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const options = route ? [route.primary, ...(route.alternatives ?? [])] : [];
  return <section className="card map-card" aria-labelledby="map-title"><div className="section-heading"><div><p className="eyebrow">Seguimiento en vivo</p><h2 id="map-title">Ruta de la ambulancia</h2></div><span className={`status-dot ${arrived ? 'arrived' : 'moving'}`}>{arrived ? 'Llegó' : 'En camino'}</span></div>{import.meta.env.VITE_GOOGLE_MAPS_API_KEY && route ? <GoogleMap arrived={arrived} userLocation={userLocation} route={route} selectedIndex={selectedIndex} /> : <SimulatedMap arrived={arrived} />}<div className="map-legend"><span><i className="legend-dot user" />Tu ubicación</span><span><i className="legend-dot ambulance" />Ambulancia</span><span><i className="legend-dot hospital" />Hospital</span></div><div className="route-summary">{options.map((option, index) => <button type="button" className={`route-option ${index === selectedIndex ? 'selected' : ''} ${index > 0 ? 'alternative-route' : ''}`} key={`${option.label ?? 'route'}-${index}`} onClick={() => setSelectedIndex(index)}><span className="route-icon">{index === 0 ? '↗' : '⇄'}</span><span>{index === 0 ? 'Ruta principal' : `Alternativa ${index}`}</span><strong>{option.estimatedMinutes} min · {(option.distanceMeters / 1000).toFixed(1)} km</strong></button>)}</div></section>;
}
