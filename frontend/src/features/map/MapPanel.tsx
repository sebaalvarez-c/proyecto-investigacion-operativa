import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hospital, StreetRoute } from '../../services/api';
import { decodeEncodedPolyline, interpolatePoint, type GeoPoint } from './map-utils';

const toLatLng = (point: GeoPoint): L.LatLngExpression => [point.latitude, point.longitude];
const noPeople: (GeoPoint & { id: string })[] = [];
function markerIcon(color: string, glyph: string): L.DivIcon {
  return L.divIcon({ className: 'ambulance-map-marker', html: `<span style="--marker-color:${color}">${glyph}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
}

export function MapPanel({ route, userLocation, hospitals, phase, onLegComplete, onPick, people = noPeople }: { route: StreetRoute | null; userLocation: GeoPoint; hospitals: Hospital[]; phase: 'idle' | 'pickup' | 'at-incident' | 'transfer' | 'arrived'; onLegComplete: () => void; onPick?: (point: GeoPoint) => void; people?: (GeoPoint & { id: string })[] }) {
  const container = useRef<HTMLDivElement>(null);
  const liveMap = useRef<L.Map | null>(null);
  const onCompleteRef = useRef(onLegComplete);
  const pickRef = useRef(onPick);
  const viewport = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  useEffect(() => { onCompleteRef.current = onLegComplete; }, [onLegComplete]);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => liveMap.current?.invalidateSize({ pan: false }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const available = route ? [route.primary, ...route.alternatives] : [];
  const option = available[selectedIndex] ?? route?.primary;
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: true, zoomControl: true });
    liveMap.current = map;
    function removeMap() { liveMap.current = null; map.remove(); }
    map.on('click', ({ latlng }: L.LeafletMouseEvent) => {
      if (!pickRef.current) return;
      viewport.current = { center: map.getCenter(), zoom: map.getZoom() };
      pickRef.current({ latitude: latlng.lat, longitude: latlng.lng });
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const selected = people.find((point) => point.latitude === userLocation.latitude && point.longitude === userLocation.longitude);
    L.marker(toLatLng(userLocation), { icon: markerIcon('#4285f4', selected?.id ?? '●'), title: selected?.id ?? 'Ubicación del incidente' }).addTo(map);
    people.filter((point) => point.latitude !== userLocation.latitude || point.longitude !== userLocation.longitude)
      .forEach((point) => L.marker(toLatLng(point), { icon: markerIcon('#4285f4', point.id), title: point.id }).addTo(map));
    const hospitalLayer = L.layerGroup().addTo(map);
    function showHospitals() {
      hospitalLayer.clearLayers();
      const groups: Hospital[][] = [];
      for (const hospital of hospitals) {
        const point = map.project(toLatLng(hospital), map.getZoom());
        const group = map.getZoom() < 17 && groups.find(([first]) => point.distanceTo(map.project(toLatLng(first), map.getZoom())) < 38);
        if (group) group.push(hospital);
        else groups.push([hospital]);
      }
      for (const [first, ...others] of groups) {
        const popup = document.createElement('div');
        popup.textContent = [first, ...others].map((hospital) => hospital.name).join(' · ');
        L.marker(toLatLng(first), { icon: markerIcon('#4f83c2', others.length ? String(others.length + 1) : '+'),
          title: popup.textContent, bubblingMouseEvents: false }).bindPopup(popup).addTo(hospitalLayer);
      }
    }
    map.on('zoomend', showHospitals);
    const path = option?.polyline ? decodeEncodedPolyline(option.polyline) : [];
    if (route && path.length > 1) {
      [route.primary, ...route.alternatives].forEach((item, index) => {
        if (item.polyline) L.polyline(decodeEncodedPolyline(item.polyline).map(toLatLng), { color: index === selectedIndex ? '#0c9e94' : '#ee865f', weight: index === selectedIndex ? 6 : 4, opacity: 0.85 }).addTo(map);
      });
      const ambulance = L.marker(toLatLng(phase === 'arrived' || phase === 'at-incident' ? path[path.length - 1] : path[0]), { icon: markerIcon('#0c9e94', '🚑'), title: 'Ambulancia simulada' }).addTo(map);
      map.fitBounds(L.latLngBounds([...path, userLocation].map(toLatLng)), { padding: [36, 36], maxZoom: 15 });
      showHospitals();
      if (phase === 'pickup' || phase === 'transfer') {
        let progress = 0;
        const timer = window.setInterval(() => {
          progress = Math.min(progress + 0.01, 1);
          const scaled = progress * (path.length - 1);
          const segment = Math.min(Math.floor(scaled), path.length - 2);
          ambulance.setLatLng(toLatLng(interpolatePoint(path[segment], path[segment + 1], scaled - segment)));
          if (progress >= 1) { window.clearInterval(timer); onCompleteRef.current(); }
        }, 120);
        return () => { window.clearInterval(timer); removeMap(); };
      }
    } else {
      const prior = viewport.current;
      if (prior) map.setView(prior.center, prior.zoom);
      else map.setView(toLatLng(userLocation), 12);
      showHospitals();
    }
    return removeMap;
  }, [route, option, hospitals, phase, selectedIndex, userLocation, people]);
  const status = phase === 'arrived' ? 'Llegó al hospital' : phase === 'at-incident' ? 'Llegó al incidente'
    : phase === 'pickup' ? 'Hacia el incidente' : 'Hacia el hospital';
  return (
    <section className="card map-card" aria-label="Mapa de despacho">
      <div ref={container} className="map-canvas street-map" role="application" aria-label="Mapa de calles de Santa Cruz" />
      <div className="map-tools">
        {phase !== 'idle' && <span className="badge badge-green">{status}</span>}
        {route && <select aria-label="Ruta en el mapa" value={available[selectedIndex] ? selectedIndex : 0}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}>
          {available.map((item, index) => <option key={index} value={index}>
            {index === 0 ? 'Principal' : 'Alternativa ' + index} · {item.estimatedMinutes} min · {(item.distanceMeters / 1000).toFixed(1)} km
          </option>)}
        </select>}
      </div>
    </section>
  );
}
