import type { TransportSolutionView } from '../../services/api';

export function TransportMatrixCard({ solution }: { solution: TransportSolutionView }) {
  return (
    <section className="card matrix-card" aria-labelledby="matrix-title">
      <div className="section-heading"><div><p className="eyebrow">Investigación operativa</p><h2 id="matrix-title">Matriz de transporte</h2></div><span className="badge badge-green">Costo mínimo</span></div>
      <div className="table-wrap"><table><thead><tr><th>Origen</th>{solution.matrix.destinations.map((destination) => <th key={destination}>{destination}</th>)}</tr></thead><tbody>{solution.matrix.origins.map((origin, row) => <tr key={origin}><th>{origin}</th>{solution.matrix.costs[row].map((cost, column) => <td key={`${origin}-${column}`} className={cost === solution.assignment.unitCost ? 'selected-cell' : ''}>{cost} min</td>)}</tr>)}</tbody></table></div>
      <div className="assignment-result"><div><span>Asignación óptima</span><strong>{solution.assignment.originId} → {solution.assignment.destinationId}</strong></div><div><span>Tiempo estimado</span><strong>{solution.assignment.unitCost} min</strong></div><div><span>Costo total</span><strong>{solution.totalCost} min</strong></div></div>
    </section>
  );
}
