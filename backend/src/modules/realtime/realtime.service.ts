import { Injectable } from '@nestjs/common';
import type { Coordinate, AmbulanceStatus } from '../../database/in-memory-store.js';

export interface PositionUpdate extends Coordinate {
  ambulanceId: string;
  status: AmbulanceStatus;
  occurredAt: string;
}

export type PositionListener = (event: PositionUpdate) => void;

export class InMemoryRealtimePublisher {
  private readonly listeners = new Map<string, Set<PositionListener>>();

  publish(event: PositionUpdate): void {
    this.listeners.get(event.ambulanceId)?.forEach((listener) => listener(event));
  }

  subscribe(ambulanceId: string, listener: PositionListener): () => void {
    const listeners = this.listeners.get(ambulanceId) ?? new Set<PositionListener>();
    listeners.add(listener);
    this.listeners.set(ambulanceId, listeners);
    return () => listeners.delete(listener);
  }
}

@Injectable()
export class AmbulanceSimulationService {
  constructor(private readonly publisher: InMemoryRealtimePublisher) {}

  async simulate(ambulanceId: string, points: Coordinate[], intervalMs = 1000): Promise<void> {
    for (const [index, point] of points.entries()) {
      const status: AmbulanceStatus = index === points.length - 1 ? 'ARRIVED' : 'ON_ROUTE';
      this.publisher.publish({ ambulanceId, ...point, status, occurredAt: new Date().toISOString() });
      if (intervalMs > 0 && index < points.length - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
