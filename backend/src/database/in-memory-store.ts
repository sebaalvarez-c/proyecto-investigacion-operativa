import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHED' | 'ON_ROUTE' | 'ARRIVED' | 'UNAVAILABLE';
export type EmergencyStatus = 'PENDING' | 'OPTIMIZING' | 'DISPATCHED' | 'ON_ROUTE' | 'ARRIVED' | 'CANCELLED';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface AmbulanceRecord extends Coordinate {
  id: string;
  code: string;
  status: AmbulanceStatus;
  capacity: number;
  currentHospitalId: string | null;
}

export interface HospitalRecord extends Coordinate {
  id: string;
  name: string;
  address: string;
  availableBeds: number;
  hasEmergencyService: boolean;
}

export interface EmergencyRecord extends Coordinate {
  id: string;
  description: string;
  status: EmergencyStatus;
  assignedAmbulanceId: string | null;
  assignedHospitalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteRecord {
  id: string;
  emergencyId: string;
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  estimatedMinutes: number;
  hasBlockage: boolean;
  alternativeRoute?: { distanceMeters: number; estimatedMinutes: number; reason: string; polyline?: string; label?: string };
  alternatives: Array<{ distanceMeters: number; estimatedMinutes: number; polyline?: string; label?: string }>;
  status: 'PRIMARY' | 'ALTERNATIVE' | 'COMPLETED';
}

export interface TransportSolutionRecord {
  id: string;
  emergencyId: string;
  method: 'MINIMUM_COST';
  initialMatrix: unknown;
  finalAssignment: unknown;
  totalCostMinutes: number;
}

@Injectable()
export class InMemoryStore {
  readonly ambulances: AmbulanceRecord[] = [
    { id: '20000000-0000-4000-8000-000000000001', code: 'AMB-SC-01', latitude: -17.773, longitude: -63.17, status: 'AVAILABLE', capacity: 1, currentHospitalId: null },
    { id: '20000000-0000-4000-8000-000000000002', code: 'AMB-SC-02', latitude: -17.792, longitude: -63.16, status: 'AVAILABLE', capacity: 1, currentHospitalId: null },
    { id: '20000000-0000-4000-8000-000000000003', code: 'AMB-SC-03', latitude: -17.75, longitude: -63.19, status: 'UNAVAILABLE', capacity: 1, currentHospitalId: null },
  ];

  readonly hospitals: HospitalRecord[] = [
    { id: '10000000-0000-4000-8000-000000000001', name: 'Hospital Japonés', address: 'Av. Japón, Santa Cruz de la Sierra', latitude: -17.7617, longitude: -63.1656, availableBeds: 12, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000002', name: 'Hospital Universitario Japonés', address: 'Av. Dr. Lucas Saucedo, Santa Cruz de la Sierra', latitude: -17.7748, longitude: -63.1821, availableBeds: 8, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000003', name: 'Hospital San Juan de Dios', address: 'Calle La Riva, Santa Cruz de la Sierra', latitude: -17.7898, longitude: -63.1812, availableBeds: 5, hasEmergencyService: true },
  ];

  readonly emergencies: EmergencyRecord[] = [];
  readonly routes: RouteRecord[] = [];
  readonly transportSolutions: TransportSolutionRecord[] = [];

  newId(): string {
    return randomUUID();
  }
}
