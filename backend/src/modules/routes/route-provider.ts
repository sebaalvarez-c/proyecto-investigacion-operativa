import { Injectable } from '@nestjs/common';
import type { Coordinate } from '../../database/in-memory-store.js';
import { chooseRecommendedRoute, parseDurationSeconds, type RouteOption } from './route-utils.js';

export type RouteResult = RouteOption;

export interface RouteProvider {
  getRoute(origin: Coordinate, destination: Coordinate, options?: { avoidBlockage?: boolean }): Promise<RouteResult>;
}

@Injectable()
export class GoogleRoutesProvider {
  async getRoutes(origin: Coordinate, destination: Coordinate): Promise<{ primary: RouteResult; alternatives: RouteResult[] } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: AbortSignal.timeout(4500),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.routeLabels,routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', computeAlternativeRoutes: true,
        polylineQuality: 'HIGH_QUALITY', polylineEncoding: 'ENCODED_POLYLINE', languageCode: 'es', units: 'METRIC',
      }),
    });
    if (!response.ok) return null;
    const body = await response.json() as { routes?: Array<{ distanceMeters?: number; duration?: string; routeLabels?: string[]; polyline?: { encodedPolyline?: string } }> };
    const routes = (body.routes ?? []).map((route): RouteOption => ({
      distanceMeters: route.distanceMeters ?? 0,
      estimatedMinutes: Math.max(0.1, Math.round((parseDurationSeconds(route.duration) / 60) * 10) / 10),
      polyline: route.polyline?.encodedPolyline,
      label: route.routeLabels?.includes('DEFAULT_ROUTE') ? 'Ruta recomendada' : 'Alternativa por calle',
    })).filter((route) => route.distanceMeters > 0 && route.polyline);
    return routes.length ? chooseRecommendedRoute(routes) : null;
  }
}

@Injectable()
export class OpenStreetMapRoutesProvider {
  async getRoutes(origin: Coordinate, destination: Coordinate): Promise<{ primary: RouteResult; alternatives: RouteResult[] } | null> {
    const start = `${origin.longitude},${origin.latitude}`;
    const end = `${destination.longitude},${destination.latitude}`;
    const baseUrl = (process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
    const url = `${baseUrl}/route/v1/driving/${start};${end}?alternatives=true&overview=full&geometries=polyline`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4500), headers: { 'User-Agent': 'AmbulanceTransportAcademicPWA/1.0' } }).catch(() => null);
    if (!response?.ok) return null;
    const body = await response.json() as { routes?: Array<{ distance?: number; duration?: number; geometry?: string }> };
    const routes = (body.routes ?? []).map((route): RouteOption => ({
      distanceMeters: route.distance ?? 0,
      estimatedMinutes: Math.max(0.1, Math.round(((route.duration ?? 0) / 60) * 10) / 10),
      polyline: route.geometry,
      label: 'Ruta por OpenStreetMap',
    })).filter((route) => route.distanceMeters > 0 && route.polyline);
    return routes.length ? chooseRecommendedRoute(routes) : null;
  }
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
