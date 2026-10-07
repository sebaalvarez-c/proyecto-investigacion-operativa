import type { FormEvent } from 'react';
import type { GeoPoint } from '../map/map-utils';

interface EmergencyFormProps {
  loading: boolean;
  location: GeoPoint;
  locationMode: 'simulated' | 'current' | 'loading' | 'error';
  onLocate: () => void;
  onSubmit: (description: string) => void;
}

export function EmergencyForm({ loading, location, locationMode, onLocate, onSubmit }: EmergencyFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(String(form.get('description') ?? 'Accidente simulado')); }
  const locationLabel = locationMode === 'current' ? 'Tu ubicación actual' : locationMode === 'error' ? 'Ubicación simulada' : locationMode === 'loading' ? 'Obteniendo ubicación…' : 'Ubicación simulada';
  return (
    <form className="card emergency-form" onSubmit={handleSubmit}><div className="section-heading"><div><p className="eyebrow">Paso 1 · Reporte</p><h2>¿Qué sucedió?</h2></div><span className="step-number">01</span></div><label htmlFor="description">Descripción del incidente</label><textarea id="description" name="description" defaultValue="Accidente de tránsito en Santa Cruz" rows={3} /><div className="location-chip"><span>⌖</span><div><strong>{locationLabel}</strong><small>{location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</small></div><span className="chip-check">✓</span></div><button className="button button-location" type="button" onClick={onLocate} disabled={loading || locationMode === 'loading'}>Usar mi ubicación <span>⌖</span></button><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Calculando…' : 'Simular accidente'}<span>→</span></button></form>
  );
}
