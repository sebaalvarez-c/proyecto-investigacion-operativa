export function TrackingStatus({ arrived, connection, onArrive }: { arrived: boolean; connection: 'connecting' | 'connected' | 'reconnecting' | 'arrived'; onArrive: () => void }) {
  return (
    <section className="card tracking-card"><div className="tracking-icon">{arrived ? '✓' : '✦'}</div><div><p className="eyebrow">Estado del despacho</p><h2>{arrived ? 'Llegó al hospital' : 'Ambulancia en camino'}</h2><p>{arrived ? 'El traslado simulado terminó correctamente.' : connection === 'reconnecting' ? 'Conexión interrumpida; conservamos la última ubicación.' : 'La unidad está siguiendo la ruta seleccionada.'}</p></div>{!arrived && <button className="button button-secondary" type="button" onClick={onArrive}>Simular llegada</button>}</section>
  );
}
