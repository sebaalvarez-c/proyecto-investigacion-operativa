import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPanel } from '../map/MapPanel';
import { getHospitals, solveSimulation, type Hospital, type Patient, type SimulationResult, type SimulationTrip, type SimulationUnit } from '../../services/api';
import { CalculationBoard } from './CalculationBoard';

const initialPeople: Patient[] = [
  { id: 'P1', latitude: -17.7804, longitude: -63.1745 },
  { id: 'P2', latitude: -17.792, longitude: -63.189 },
  { id: 'P3', latitude: -17.767, longitude: -63.171 },
  { id: 'P4', latitude: -17.811, longitude: -63.161 },
  { id: 'P5', latitude: -17.777, longitude: -63.153 },
];

export function TransportSimulation() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [people, setPeople] = useState(initialPeople);
  const [selected, setSelected] = useState('P1');
  const [panel, setPanel] = useState<'setup' | 'trips' | 'matrix'>('setup');
  const [tripPage, setTripPage] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<SimulationTrip[]>([]);
  const [dispatched, setDispatched] = useState<SimulationTrip[]>([]);
  const [finished, setFinished] = useState<string[]>([]);
  const [free, setFree] = useState<SimulationUnit[]>([]);
  const [bedsUsed, setBedsUsed] = useState<string[]>([]);
  const [phase, setPhase] = useState<'pickup' | 'transfer'>('pickup');
  const lastAuto = useRef('');
  const person = people.find((item) => item.id === selected)!;
  const trip = queue[0];
  const route = trip ? trip[phase] : null;

  useEffect(() => {
    let mounted = true;
    getHospitals().then((items) => {
      if (mounted) { setHospitals(items); setIds(items.slice(0, 4).map((item) => item.id)); }
    }).catch(() => { if (mounted) setError('No se pudo cargar el catálogo de hospitales.'); });
    return () => { mounted = false; };
  }, []);

  const reserve = useCallback((solution: SimulationResult) => {
    setQueue((previous) => [...previous, ...solution.assignments]);
    setDispatched((previous) => [...previous, ...solution.assignments]);
    setBedsUsed((previous) => [...previous, ...solution.assignments.map((item) => item.hospital.id)]);
    setFree((previous) => previous.filter((unit) => !solution.assignments.some((item) => item.unit.id === unit.id)));
  }, []);

  const calculate = useCallback(async () => {
    const units = started ? free : Array.from({ length: 3 }, (_, i) => ({
      hospitalId: ids[i % ids.length], id: 'A' + (i + 1),
    }));
    const patients = people.filter((item) => !finished.includes(item.id) && !queue.some((itemInQueue) => itemInQueue.patientId === item.id));
    if (!patients.length) return;
    setBusy(true);
    setError('');
    try {
      const solution = await solveSimulation({ hospitalIds: ids, patients, units, bedsUsed });
      setResult(solution);
      if (!started) { setPanel('matrix'); setTripPage(0); }
      if (started) reserve(solution);
      else setFree(units);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo calcular la matriz.');
    } finally { setBusy(false); }
  }, [bedsUsed, finished, free, ids, people, queue, reserve, started]);

  useEffect(() => {
    if (!started || busy || !finished.length || !free.length || !result?.pending.length) return;
    const key = finished.join(',');
    if (lastAuto.current === key) return;
    lastAuto.current = key;
    void calculate();
  }, [busy, calculate, finished, free, result, started]);

  function completeLeg() {
    if (!trip) return;
    if (phase === 'pickup') { setPhase('transfer'); return; }
    setFinished((previous) => [...previous, trip.patientId]);
    setFree((previous) => [...previous, { ...trip.unit, hospitalId: trip.hospital.id }]);
    setQueue((previous) => previous.slice(1));
    setPhase('pickup');
  }

  function reset() {
    lastAuto.current = '';
    setStarted(false);
    setQueue([]);
    setDispatched([]);
    setFinished([]);
    setFree([]);
    setBedsUsed([]);
    setResult(null);
    setPhase('pickup');
    setError('');
    setPanel('setup');
    setTripPage(0);
  }

  function setHospital(slot: number, hospitalId: string) {
    const next = [...ids];
    if (!hospitalId) next.splice(slot, 1);
    else next[slot] = hospitalId;
    setIds(next);
    setResult(null);
  }

  const trips = started ? dispatched : result?.assignments ?? [];
  const shownTrip = trips[tripPage];

  return (
      <div className="dispatch-workspace">
        <MapPanel key={trip?.patientId ?? 'setup'} route={route} userLocation={trip?.pickup.destination ?? person}
          hospitals={hospitals} phase={trip && route?.primary.polyline ? phase : 'idle'} onLegComplete={completeLeg}
          people={people} onPick={busy || started ? undefined : (point) => {
            setPeople((current) => current.map((item) => item.id === selected ? { ...item, ...point } : item));
            setResult(null);
            setPanel('setup');
          }} />
        <aside className="dispatch-sheet" aria-label="Panel de múltiples incidentes">
          <nav className="screen-tabs" aria-label="Escenario múltiple">
            <button type="button" aria-pressed={panel === 'setup'} onClick={() => setPanel('setup')}>Escenario</button>
            <button type="button" disabled={!result} aria-pressed={panel === 'trips'} onClick={() => setPanel('trips')}>Despachos</button>
            <button type="button" disabled={!result} aria-pressed={panel === 'matrix'} onClick={() => setPanel('matrix')}>Matriz</button>
          </nav>
          <div className="sheet-content" hidden={panel !== 'setup'}>
            <fieldset className="scenario-fields" disabled={busy || started}>
              <legend>Hospitales participantes</legend>
              <div className="hospital-slots">
                {Array.from({ length: Math.min(ids.length + 1, 4) }, (_, index) => (
                  <label key={index}>H{index + 1}
                    <select value={ids[index] ?? ''} onChange={(event) => setHospital(index, event.target.value)}>
                      <option value="">{ids[index] ? 'Quitar hospital' : 'Añadir hospital'}</option>
                      {hospitals.filter((hospital) => hospital.id === ids[index] || !ids.includes(hospital.id))
                        .map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            <label htmlFor="sim-person">Persona que vas a ubicar en el mapa</label>
            <select id="sim-person" value={selected} onChange={(event) => setSelected(event.target.value)}>
              {people.map((item) => <option key={item.id}>{item.id}</option>)}
            </select>
            </fieldset>
          </div>
          {result && panel === 'matrix' && <div className="sheet-content">
            <CalculationBoard key={result.columns.map((item) => item.id).join(',')} result={result} />
          </div>}
          {result && panel === 'trips' && <div className="sheet-content trip-panel">
            <p aria-live="polite">En espera: {result.pending.join(', ') || 'ninguna'} · Completadas: {finished.join(', ') || 'ninguna'}</p>
            {shownTrip && <article className="trip-summary">
              <strong>{shownTrip.patientId} · {shownTrip.unit.id}</strong>
              <p>{shownTrip.base.name} → {shownTrip.hospital.name}</p>
              <p>Llegada: {shownTrip.pickup.primary.estimatedMinutes} min · Traslado: {shownTrip.transfer.primary.estimatedMinutes} min · Bs {shownTrip.priceBs.toFixed(2)} de ida</p>
              {started && <small>{finished.includes(shownTrip.patientId) ? 'Completado' : shownTrip === trip ? 'En mapa' : 'Despachado'}</small>}
            </article>}
            {trips.length > 1 && <div className="screen-pager">
              <button type="button" disabled={tripPage === 0} onClick={() => setTripPage(tripPage - 1)}>Anterior</button>
              <span>{tripPage + 1} / {trips.length}</span>
              <button type="button" disabled={tripPage + 1 === trips.length} onClick={() => setTripPage(tripPage + 1)}>Siguiente</button>
            </div>}
          </div>}
          {error && <p className="error-banner" role="alert">{error}</p>}
          {trip && <p className="screen-status" aria-live="polite">En mapa: {trip.unit.id} para {trip.patientId}</p>}
          <div className="sheet-actions">
            <button type="button" disabled={busy || !ids.length || (started && (!free.length || !result?.pending.length))}
              onClick={calculate}>{busy ? 'Calculando…' : started ? 'Recalcular pendientes' : 'Calcular matriz'}</button>
            {result && !started && <button type="button" disabled={busy || !result.assignments.length}
              onClick={() => { setStarted(true); setPanel('trips'); reserve(result); }}>Iniciar despachos</button>}
            {started && <button type="button" disabled={busy} onClick={reset}>Reiniciar escenario</button>}
            {route && !route.primary.polyline && <button type="button" onClick={completeLeg}>Completar tramo estimado</button>}
          </div>
        </aside>
      </div>
  );
}
