import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./features/map/MapPanel', () => ({ MapPanel: () => <div>Mapa de calles</div> }));

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
    fireEvent.click(screen.getAllByRole('button', { name: /elegir ambulancia/i })[1]);
    expect(await screen.findByText('Destino recomendado')).toBeInTheDocument();
    expect(screen.getByText(/AMB-02 · Bs 70.00/)).toBeInTheDocument();
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
});
