import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hospital, StreetRoute } from '../../services/api';
import { decodeEncodedPolyline, interpolatePoint, type GeoPoint } from './map-utils';

const toLatLng = (point: GeoPoint): L.LatLngExpression => [point.latitude, point.longitude];
function markerIcon(color: string, glyph: string): L.DivIcon {
  return L.divIcon({ className: 'ambulance-map-marker', html: `<span style="--marker-color:${color}">${glyph}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
}

export function MapPanel({ route, userLocation, hospitals, phase, onLegComplete }: { route: StreetRoute | null; userLocation: GeoPoint; hospitals: Hospital[]; phase: 'idle' | 'pickup' | 'at-incident' | 'transfer' | 'arrived'; onLegComplete: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onLegComplete);
  useEffect(() => { onCompleteRef.current = onLegComplete; }, [onLegComplete]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const available = route ? [route.primary, ...route.alternatives] : [];
  const option = available[selectedIndex] ?? route?.primary;
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    L.marker(toLatLng(userLocation), { icon: markerIcon('#4285f4', '●'), title: 'Ubicación del incidente' }).addTo(map);
    hospitals.forEach((hospital) => L.marker(toLatLng(hospital), { icon: markerIcon('#4f83c2', '+'), title: hospital.name }).bindPopup(hospital.name).addTo(map));
    const path = option?.polyline ? decodeEncodedPolyline(option.polyline) : [];
    if (route && path.length > 1) {
      [route.primary, ...route.alternatives].forEach((item, index) => {
        if (item.polyline) L.polyline(decodeEncodedPolyline(item.polyline).map(toLatLng), { color: index === selectedIndex ? '#0c9e94' : '#ee865f', weight: index === selectedIndex ? 6 : 4, opacity: 0.85 }).addTo(map);
      });
      const ambulance = L.marker(toLatLng(phase === 'arrived' || phase === 'at-incident' ? path[path.length - 1] : path[0]), { icon: markerIcon('#0c9e94', '🚑'), title: 'Ambulancia simulada' }).addTo(map);
      map.fitBounds(L.latLngBounds([...path, userLocation].map(toLatLng)), { padding: [36, 36], maxZoom: 15 });
      if (phase === 'pickup' || phase === 'transfer') {
        let progress = 0;
        const timer = window.setInterval(() => {
          progress = Math.min(progress + 0.01, 1);
          const scaled = progress * (path.length - 1);
          const segment = Math.min(Math.floor(scaled), path.length - 2);
          ambulance.setLatLng(toLatLng(interpolatePoint(path[segment], path[segment + 1], scaled - segment)));
          if (progress >= 1) { window.clearInterval(timer); onCompleteRef.current(); }
        }, 120);
        return () => { window.clearInterval(timer); map.remove(); };
      }
    } else {
      map.setView(toLatLng(userLocation), 12);
    }
    return () => map.remove();
  }, [route, option, hospitals, phase, selectedIndex, userLocation]);
  return <section className="card map-card" aria-labelledby="map-title"><div className="section-heading"><div><p className="eyebrow">Mapa de Santa Cruz</p><h2 id="map-title">{phase === 'idle' ? 'Mapa de despacho' : 'Ruta de la ambulancia'}</h2></div>{phase !== 'idle' && <span className="badge badge-green">{phase === 'arrived' ? 'Llegó al hospital' : phase === 'at-incident' ? 'Llegó al incidente' : phase === 'pickup' ? 'Hacia el incidente' : 'Hacia el hospital'}</span>}</div><div ref={container} className="map-canvas street-map" role="application" aria-label="Mapa de calles de Santa Cruz" /><div className="map-legend"><span><i className="legend-dot user" />Tu ubicación</span><span><i className="legend-dot hospital" />Hospital</span>{route && <span><i className="legend-dot ambulance" />Ambulancia</span>}</div>{route && <div className="route-summary">{available.map((item, index) => <button type="button" className={`route-option ${index === selectedIndex ? 'selected' : ''}`} key={index} onClick={() => setSelectedIndex(index)}><span className="route-icon">↗</span><span>{index === 0 ? 'Ruta principal' : `Alternativa ${index}`}</span><strong>{item.estimatedMinutes} min · {(item.distanceMeters / 1000).toFixed(1)} km</strong></button>)}</div>}</section>;
}
