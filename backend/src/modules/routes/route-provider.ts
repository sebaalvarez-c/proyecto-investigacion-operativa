import { Injectable } from '@nestjs/common';
import type { Coordinate } from '../../database/in-memory-store.js';

export interface RouteResult {
  distanceMeters: number;
  estimatedMinutes: number;
}

export interface RouteProvider {
  getRoute(origin: Coordinate, destination: Coordinate, options?: { avoidBlockage?: boolean }): Promise<RouteResult>;
}

@Injectable()
export class DeterministicRouteProvider implements RouteProvider {
  async getRoute(origin: Coordinate, destination: Coordinate, options: { avoidBlockage?: boolean } = {}): Promise<RouteResult> {
    const latitudeDistance = (destination.latitude - origin.latitude) * 111_000;
    const longitudeDistance = (destination.longitude - origin.longitude) * 106_000;
    const straightLineMeters = Math.sqrt(latitudeDistance ** 2 + longitudeDistance ** 2);
    const roadFactor = options.avoidBlockage ? 1.28 : 1.12;
    const distanceMeters = Math.max(300, Math.round(straightLineMeters * roadFactor));
    const estimatedMinutes = Math.max(1, Math.round((distanceMeters / 1000 / 0.5) * 10) / 10);
    return { distanceMeters, estimatedMinutes };
  }
}
