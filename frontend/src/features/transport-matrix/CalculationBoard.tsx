import { useState } from 'react';
import type { SimulationResult } from '../../services/api';

const minutes = (tenths: number) => (tenths / 10).toFixed(1);

export function CalculationBoard({ result }: { result: SimulationResult }) {
  const [view, setView] = useState<'initial' | 'final'>('final');
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [page, setPage] = useState<'table' | 'cell' | 'vogel' | 'cycles'>('table');
  const [stepIndex, setStepIndex] = useState(0);
  const { rows, columns, costs, cells, supply, demand, trace } = result;
  const { row, col } = selected;
  const details = cells[row]?.[col];
  const label = (r: number, c: number) => `${rows[r].label} → ${columns[c].label}`;
  const penalties = (values: (number | null)[], labels: { label: string }[]) =>
    values.flatMap((value, i) => value === null ? [] : [`${labels[i].label}: ${minutes(value)}`]).join(' · ');
  const steps = page === 'vogel' ? trace.vogel.length : trace.improvements.length;
  const vogel = trace.vogel[stepIndex];
  const cycle = trace.improvements[stepIndex];
  const show = (next: typeof page) => { setPage(next); setStepIndex(0); };
  return (
    <section className="card matrix-card io-board" aria-labelledby="io-title">
      <div className="io-title-row"><h2 id="io-title">Cómo se calculó</h2><strong>{minutes(trace.finalCost)} min</strong></div>
      <nav className="screen-tabs board-tabs" aria-label="Cálculo">
        <button type="button" aria-pressed={page === 'table'} onClick={() => show('table')}>Tabla</button>
        <button type="button" aria-pressed={page === 'cell'} onClick={() => show('cell')}>Celda</button>
        <button type="button" aria-pressed={page === 'vogel'} onClick={() => show('vogel')}>Vogel</button>
        <button type="button" aria-pressed={page === 'cycles'} onClick={() => show('cycles')}>Salto de piedra</button>
      </nav>
      {page === 'table' && <>
      <div className="screen-tabs board-switch" aria-label="Solución">
        <button type="button" aria-pressed={view === 'initial'} onClick={() => setView('initial')}>Inicial · {minutes(trace.initialCost)} min</button>
        <button type="button" aria-pressed={view === 'final'} onClick={() => setView('final')}>Final · {minutes(trace.finalCost)} min</button>
      </div>
      <div className="table-wrap board-table">
        <table>
          <caption>Matriz de transporte · minutos por persona</caption>
          <thead><tr><th scope="col">Base</th>{columns.map((column) => <th scope="col" key={column.id}>{column.id === 'idle' ? 'Ocio' : column.label}</th>)}<th scope="col">Oferta</th></tr></thead>
          <tbody>
            {rows.map((item, r) => <tr key={item.id}>
              <th scope="row" title={item.name}>{item.label}</th>
              {columns.map((column, c) => <td key={column.id} className={trace[view][r][c] ? 'selected-cell' : ''}>
                <button type="button" className="io-cell" aria-label={`${label(r, c)} · ${cells[r]?.[c] ? minutes(costs[r][c]) + ' min' : 'Auxiliar'} · ${trace[view][r][c]} asignadas`} onClick={() => { setSelected({ row: r, col: c }); show('cell'); }}>
                  {cells[r]?.[c] ? minutes(costs[r][c]) : '—'}
                  {trace[view][r][c] > 0 && <small>×{trace[view][r][c]}</small>}
                </button>
              </td>)}
              <td>{supply[r]}</td>
            </tr>)}
          </tbody>
          <tfoot><tr><th scope="row">Demanda</th>{demand.map((value, i) => <td key={columns[i].id}>{value}</td>)}<td>{supply.reduce((a, b) => a + b, 0)}</td></tr></tfoot>
        </table>
      </div>
      </>}
      {page === 'cell' && <div className="io-detail" aria-live="polite">
        <strong>{label(row, col)} · {rows[row].name}</strong>
        {details ? <>
          <p>{details.source} · {(details.meters / 1000).toFixed(3)} km · {minutes(costs[row][col])} min de llegada.</p>
          <p>Tarifa simulada de ida: Bs {details.baseFare.toFixed(2)} + Bs {details.farePerKm.toFixed(2)}/km × {(details.meters / 1000).toFixed(3)} km = <strong>Bs {details.priceBs.toFixed(2)}</strong>.</p>
          <p>{details.source === 'Estimación simulada' ? 'Distancia aproximada: línea recta × 1.12, con mínimo de 300 m. Tiempo: distancia ÷ 30 km/h, con mínimo de 1 min.' : 'El proveedor devuelve la duración del recorrido por calles en segundos. Se divide por 60 y se redondea a una décima de minuto.'}</p>
        </> : <p>Celda auxiliar para equilibrar la oferta y la demanda.</p>}
      </div>}
      {page === 'vogel' && vogel && <div className="io-detail">{[vogel].map((step) => <div key={stepIndex}>
          <strong>{label(step.row, step.col)} · {step.quantity} unidad(es)</strong>
          <p>Penalización elegida: {step.alternatives.length === 2
            ? `${minutes(step.alternatives[1])} − ${minutes(step.alternatives[0])} = ${minutes(step.penalty)}`
            : `${minutes(step.penalty)} (única celda disponible)`}.</p>
          <p>Se eligió {step.axis === 'row' ? 'la fila ' + rows[step.index].label : 'la columna ' + columns[step.index].label} y su celda de menor costo.</p>
          <small>Filas: {penalties(step.rowPenalties, rows)}. Columnas: {penalties(step.columnPenalties, columns)}.</small>
        </div>)}</div>}
      {page === 'cycles' && <div className="io-detail">
        {!cycle ? <p>La solución inicial ya era óptima para esta matriz.</p> :
          [cycle].map((step) => <div key={stepIndex}>
            <p>{step.cycle.map((cell, j) => `${j % 2 ? '−' : '+'} ${label(cell.row, cell.col)} (${minutes(costs[cell.row][cell.col])})`).join(' · ')}</p>
            <p>Variación por unidad: {minutes(step.delta)} min. Unidades movidas: {step.quantity}. Nuevo total: {minutes(step.cost)} min.</p>
            {step.quantity === 0 && <p>Cambió la base del cálculo; las asignaciones aún son las mismas.</p>}
          </div>)}
        <small>Total = Σ(minutos × unidades). Costo mínimo de referencia: {minutes(result.minimumCost)}.</small>
      </div>}
      {(page === 'vogel' || page === 'cycles') && steps > 0 && <div className="screen-pager">
        <button type="button" disabled={!stepIndex} onClick={() => setStepIndex(stepIndex - 1)}>Anterior</button>
        <span>Paso {stepIndex + 1} / {steps}</span>
        <button type="button" disabled={stepIndex + 1 >= steps} onClick={() => setStepIndex(stepIndex + 1)}>Siguiente</button>
      </div>}
    </section>
  );
}
