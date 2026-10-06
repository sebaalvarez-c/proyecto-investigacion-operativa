export interface Emergency {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
}

export interface TransportMatrix {
  origins: string[];
  destinations: string[];
  costs: number[][];
  supply: number[];
  demand: number[];
}

export interface Assignment {
  originId: string;
  destinationId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface TransportSolutionView {
  matrix: TransportMatrix;
  assignment: Assignment;
  allocations: Assignment[];
  totalCost: number;
}

export interface RouteView {
  distanceMeters: number;
  estimatedMinutes: number;
  hasBlockage: boolean;
  primary: { distanceMeters: number; estimatedMinutes: number; polyline?: string; label?: string };
  alternative?: { distanceMeters: number; estimatedMinutes: number; reason: string; polyline?: string; label?: string };
  alternatives?: Array<{ distanceMeters: number; estimatedMinutes: number; polyline?: string; label?: string }>;
}

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `La API respondió ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createEmergency(input: Pick<Emergency, 'description' | 'latitude' | 'longitude'>): Promise<Emergency> {
  return request<Emergency>('/emergencies', { method: 'POST', body: JSON.stringify(input) });
}

export function optimizeEmergency(id: string): Promise<TransportSolutionView> {
  return request<TransportSolutionView>(`/emergencies/${id}/optimize`, { method: 'POST' });
}

export function getRoute(id: string): Promise<RouteView> {
  return request<RouteView>(`/emergencies/${id}/route?blockage=true`, { method: 'POST' });
}
