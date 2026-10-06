import type { FormEvent } from 'react';

export function EmergencyForm({ loading, onSubmit }: { loading: boolean; onSubmit: (description: string) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit(String(form.get('description') ?? 'Accidente simulado')); }
  return (
    <form className="card emergency-form" onSubmit={handleSubmit}><div className="section-heading"><div><p className="eyebrow">Paso 1 · Reporte</p><h2>¿Qué sucedió?</h2></div><span className="step-number">01</span></div><label htmlFor="description">Descripción del incidente</label><textarea id="description" name="description" defaultValue="Accidente de tránsito en Santa Cruz" rows={3} /><div className="location-chip"><span>⌖</span><div><strong>Ubicación simulada</strong><small>17°46′49″S · 63°10′28″O</small></div><span className="chip-check">✓</span></div><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Calculando…' : 'Simular accidente'}<span>→</span></button></form>
  );
}
