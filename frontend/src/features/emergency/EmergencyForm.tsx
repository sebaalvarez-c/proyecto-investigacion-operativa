import type { FormEvent } from 'react';
import type { GeoPoint } from '../map/map-utils';

interface EmergencyFormProps {
  loading: boolean;
  location: GeoPoint;
  locationMode: 'simulated' | 'map' | 'current' | 'loading' | 'error';
  onLocate: () => void;
  onSubmit: (description: string) => void;
}

export function EmergencyForm({ loading, location, locationMode, onLocate, onSubmit }: EmergencyFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(String(form.get('description') ?? 'Accidente simulado')); }
  const locationLabel = locationMode === 'map' ? 'Ubicación elegida en el mapa' : locationMode === 'current' ? 'Tu ubicación actual' : locationMode === 'loading' ? 'Obteniendo ubicación…' : 'Ubicación simulada';
  return (
    <form className="emergency-form" onSubmit={handleSubmit}>
      <h2>Ubicación del incidente</h2>
      <div className="location-chip">
        <div><strong>{locationLabel}</strong><small>{location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</small></div>
        <button className="button button-location" type="button" onClick={onLocate} disabled={loading || locationMode === 'loading'}>Usar mi ubicación</button>
      </div>
      <label htmlFor="description">Descripción del incidente</label>
      <textarea id="description" name="description" defaultValue="Accidente de tránsito en Santa Cruz" rows={2} />
      <button className="button button-primary" type="submit" disabled={loading || locationMode === 'loading'}>{loading ? 'Calculando…' : 'Simular accidente'}</button>
    </form>
  );
}
