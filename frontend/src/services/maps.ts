import type { RouteView } from './api';

export interface AmbulancePosition { latitude: number; longitude: number; }

export interface MapAdapter {
  renderRoute(route: RouteView): void;
  moveAmbulance(position: AmbulancePosition): void;
}

export class MockMapAdapter implements MapAdapter {
  lastRoute: RouteView | null = null;
  lastPosition: AmbulancePosition | null = null;
  renderRoute(route: RouteView): void { this.lastRoute = route; }
  moveAmbulance(position: AmbulancePosition): void { this.lastPosition = position; }
}

export function createMapAdapter(): MapAdapter { return new MockMapAdapter(); }
