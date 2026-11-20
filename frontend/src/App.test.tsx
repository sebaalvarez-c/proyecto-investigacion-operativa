import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./features/map/MapPanel', () => ({
  MapPanel: ({ onPick }: { onPick?: (point: { latitude: number; longitude: number }) => void }) =>
    <button type="button" onClick={() => onPick?.({ latitude: -17.812, longitude: -63.161 })}>Punto del mapa</button>,
}));

describe('ambulance dispatch workflow', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lets the user compare available ambulances and choose the cheaper one', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const hospital = { id: 'h1', name: 'Hospital Japonés', latitude: -17.76, longitude: -63.16 };
      if (url.includes('/hospitals')) return Promise.resolve(new Response(JSON.stringify([hospital])));
      if (url.endsWith('/emergencies')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 'emergency-1', status: 'PENDING' }), { status: 201 }));
      }
      if (url.includes('/ambulance-options')) return Promise.resolve(new Response(JSON.stringify([
        { id: 'a1', code: 'AMB-01', hospital, distanceMeters: 1000, estimatedMinutes: 3, priceBs: 100 },
        { id: 'a2', code: 'AMB-02', hospital, distanceMeters: 2000, estimatedMinutes: 5, priceBs: 70 },
      ])));
      if (url.includes('/dispatch')) {
        return Promise.resolve(new Response(JSON.stringify({
          ambulance: { id: 'a2', code: 'AMB-02' }, base: hospital, hospital, priceBs: 70,
          pickup: { primary: { distanceMeters: 2000, estimatedMinutes: 5 }, alternatives: [] },
          transfer: { primary: { distanceMeters: 3000, estimatedMinutes: 9 }, alternatives: [] },
          solution: { matrix: { origins: ['AMB-02'], destinations: ['Hospital Japonés'], costs: [[9]], supply: [1], demand: [1] }, assignment: { originId: 'AMB-02', destinationId: 'Hospital Japonés', quantity: 1, unitCost: 9, totalCost: 9 }, allocations: [], totalCost: 9 },
        }), { status: 201 }));
      }
      return Promise.resolve(new Response('{}'));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /simular accidente/i }));

    expect(await screen.findByText('Más cercana')).toBeInTheDocument();
    expect(screen.getByText('Más económica')).toBeInTheDocument();
    expect(screen.getByText('Tarifa académica estimada · no es un cobro real')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /elegir ambulancia/i })[1]);
    expect(await screen.findByText(/AMB-02 · Bs 70.00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Matriz' }));
    expect(screen.getByText('Destino recomendado')).toBeVisible();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/dispatch'), expect.objectContaining({ body: JSON.stringify({ ambulanceId: 'a2' }) })));
  });

  it('uses the browser location when the user requests it', async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    const success = getCurrentPosition.mock.calls[0][0] as (position: { coords: { latitude: number; longitude: number } }) => void;
    success({ coords: { latitude: -17.765, longitude: -63.178 } });

    expect(await screen.findByText(/-17\.765, -63\.178/)).toBeInTheDocument();
  });

  it('sends the selected map coordinates when creating an emergency', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(
      url.endsWith('/emergencies') ? JSON.stringify({ id: 'e1' }) : '[]',
    )));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Punto del mapa' }));
    expect(screen.getByText('Ubicación elegida en el mapa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /simular accidente/i }));
    await screen.findByText(/no hay ambulancias disponibles/i);
    const creation = fetchMock.mock.calls.find(([url]) => url.endsWith('/emergencies')) as unknown as [string, RequestInit];
    expect(JSON.parse(String(creation[1].body))).toMatchObject({ latitude: -17.812, longitude: -63.161 });
  });

  it('shows every available ambulance in the desktop panel', async () => {
    const hospital = { id: 'h1', name: 'Hospital Japonés', latitude: -17.76, longitude: -63.16 };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/hospitals')) return Promise.resolve(new Response(JSON.stringify([hospital])));
      if (url.endsWith('/emergencies')) return Promise.resolve(new Response(JSON.stringify({ id: 'e1' }), { status: 201 }));
      if (url.includes('/ambulance-options')) return Promise.resolve(new Response(JSON.stringify(
        [1, 2, 3, 4].map((n) => ({ id: `a${n}`, code: `AMB-0${n}`, hospital, distanceMeters: n * 1000, estimatedMinutes: n, priceBs: n * 50 })),
      )));
      return Promise.resolve(new Response('{}'));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /simular accidente/i }));

    expect(await screen.findByText('AMB-01')).toBeInTheDocument();
    expect(screen.getByText('AMB-02')).toBeInTheDocument();
    expect(screen.getByText('AMB-03')).toBeInTheDocument();
    expect(screen.getByText('AMB-04')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
  });

  it('explains the dispatch flow and exposes the current phase', () => {
    render(<App />);

    expect(screen.getByText('Ubica el incidente')).toBeInTheDocument();
    expect(screen.getByText('Compara ambulancias')).toBeInTheDocument();
    expect(screen.getByText('Sigue el traslado')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Listo para buscar ambulancias');
  });

  it('translates network failures into a useful Spanish message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /simular accidente/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Failed to fetch');
  });
});
