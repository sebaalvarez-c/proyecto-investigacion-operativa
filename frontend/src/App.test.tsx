import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('ambulance dispatch workflow', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('submits an emergency and shows the matrix, route, and arrival state', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/emergencies')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 'emergency-1', status: 'PENDING' }), { status: 201 }));
      }
      if (url.includes('/optimize')) {
        return Promise.resolve(new Response(JSON.stringify({
          matrix: { origins: ['AMB-SC-01'], destinations: ['Hospital Japonés'], costs: [[9]], supply: [1], demand: [1] },
          assignment: { originId: 'AMB-SC-01', destinationId: 'Hospital Japonés', quantity: 1, unitCost: 9, totalCost: 9 },
          allocations: [],
          totalCost: 9,
        }), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        primary: { distanceMeters: 2400, estimatedMinutes: 9.5 },
        alternative: undefined,
        hasBlockage: false,
      }), { status: 201 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /simular accidente/i }));

    expect(await screen.findByText('Asignación óptima')).toBeInTheDocument();
    expect(screen.getByText('Hospital Japonés')).toBeInTheDocument();
    expect(screen.getByText('Ruta principal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /simular llegada/i }));
    await waitFor(() => expect(screen.getByText('Llegó al hospital')).toBeInTheDocument());
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
