import { useState } from 'react';
import type { TransportSolutionView } from '../../services/api';

export function TransportMatrixCard({ solution }: { solution: TransportSolutionView }) {
  const [page, setPage] = useState(0);
  const pageSize = 2;
  const first = page * pageSize;
  const destinations = solution.matrix.destinations.slice(first, first + pageSize);
  const pages = Math.ceil(solution.matrix.destinations.length / pageSize);
  return (
    <section className="card matrix-card" aria-labelledby="matrix-title">
      <h2 id="matrix-title">Matriz de transporte</h2>
      <p className="demo-note">Tiempo total por destino para la unidad elegida.</p>
      <div className="table-wrap board-table">
        <table>
          <thead><tr><th scope="col">Origen</th>{destinations.map((destination) => <th scope="col" key={destination}>{destination}</th>)}</tr></thead>
          <tbody>{solution.matrix.origins.map((origin, row) => (
            <tr key={origin}><th scope="row">{origin}</th>{destinations.map((destination, column) => (
              <td key={destination} className={origin === solution.assignment.originId && destination === solution.assignment.destinationId ? 'selected-cell' : ''}>
                {solution.matrix.costs[row][first + column]} min
              </td>
            ))}</tr>
          ))}</tbody>
        </table>
      </div>
      {pages > 1 && <div className="screen-pager">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>{page + 1} / {pages}</span>
        <button type="button" disabled={page + 1 === pages} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>}
      <div className="trip-summary"><span>Destino recomendado</span><br /><strong>{solution.assignment.destinationId} · {solution.totalCost} min</strong></div>
    </section>
  );
}
