import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  baseFare: number;
  farePerKm: number;
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

export type DispatchEventType = 'CREATED' | 'OPTIONS_FOUND' | 'ASSIGNED' | 'ARRIVED_AT_INCIDENT' | 'TRANSFER_STARTED' | 'ARRIVED_AT_HOSPITAL' | 'CANCELLED';
export interface DispatchEventRecord {
  id: string;
  emergencyId: string;
  eventType: DispatchEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export type CommunicationSender = 'ambulance' | 'hospital';
export interface CommunicationRecord {
  id: string;
  emergencyId: string;
  from: CommunicationSender;
  text: string;
  isAudio: boolean;
  ambulanceCode?: string;
  recipientEmail?: string;
  createdAt: string;
}

@Injectable()
export class InMemoryStore {
  readonly databaseMode = process.env.DATABASE_MODE ?? 'memory';
  private readonly supabase: SupabaseClient | null = this.createSupabaseClient();
  readonly ambulances: AmbulanceRecord[] = [
    { id: '20000000-0000-4000-8000-000000000001', code: 'AMB-SC-01', latitude: -17.7731436, longitude: -63.1550478, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000001', baseFare: 80, farePerKm: 8 },
    { id: '20000000-0000-4000-8000-000000000002', code: 'AMB-SC-02', latitude: -17.7978423, longitude: -63.1352013, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000002', baseFare: 95, farePerKm: 7 },
    { id: '20000000-0000-4000-8000-000000000003', code: 'AMB-SC-03', latitude: -17.779274, longitude: -63.1863553, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000003', baseFare: 65, farePerKm: 6 },
    { id: '20000000-0000-4000-8000-000000000004', code: 'AMB-SC-04', latitude: -17.7590925, longitude: -63.1084301, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000004', baseFare: 75, farePerKm: 9 },
    { id: '20000000-0000-4000-8000-000000000005', code: 'AMB-SC-05', latitude: -17.8551372, longitude: -63.1896206, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000005', baseFare: 100, farePerKm: 5 },
    { id: '20000000-0000-4000-8000-000000000006', code: 'AMB-SC-06', latitude: -17.7809723, longitude: -63.1863038, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000006', baseFare: 70, farePerKm: 7 },
    { id: '20000000-0000-4000-8000-000000000007', code: 'AMB-SC-07', latitude: -17.7781027, longitude: -63.1875549, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000007', baseFare: 85, farePerKm: 6 },
    { id: '20000000-0000-4000-8000-000000000008', code: 'AMB-SC-08', latitude: -17.8387857, longitude: -63.1101281, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000008', baseFare: 60, farePerKm: 8 },
    { id: '20000000-0000-4000-8000-000000000009', code: 'AMB-SC-09', latitude: -17.7996139, longitude: -63.1180817, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000009', baseFare: 90, farePerKm: 6 },
    { id: '20000000-0000-4000-8000-000000000010', code: 'AMB-SC-10', latitude: -17.7362258, longitude: -63.1614352, status: 'AVAILABLE', capacity: 1, currentHospitalId: '10000000-0000-4000-8000-000000000021', baseFare: 75, farePerKm: 7 },
  ];

  readonly hospitals: HospitalRecord[] = [
    // Coordinates: municipal Guía Urbana, public health layers (25, 21, DEPARTAMENTAL, 20.1).
    { id: '10000000-0000-4000-8000-000000000001', name: 'Hospital Japonés', address: 'Santa Cruz de la Sierra', latitude: -17.7731436, longitude: -63.1550478, availableBeds: 12, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000002', name: 'Hospital Universitario Hernández Vera', address: 'Santa Cruz de la Sierra', latitude: -17.7978423, longitude: -63.1352013, availableBeds: 8, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000003', name: 'Hospital San Juan de Dios', address: 'Santa Cruz de la Sierra', latitude: -17.779274, longitude: -63.1863553, availableBeds: 5, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000004', name: 'Hospital Municipal Pampa de la Isla', address: 'Santa Cruz de la Sierra', latitude: -17.7590925, longitude: -63.1084301, availableBeds: 7, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000005', name: 'Hospital Municipal Francés', address: 'Santa Cruz de la Sierra', latitude: -17.8551372, longitude: -63.1896206, availableBeds: 9, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000006', name: 'Hospital de Niños Mario Ortiz', address: 'Santa Cruz de la Sierra', latitude: -17.7809723, longitude: -63.1863038, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000007', name: 'Maternidad Percy Boland', address: 'Santa Cruz de la Sierra', latitude: -17.7781027, longitude: -63.1875549, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000008', name: 'Hospital Municipal Plan 3000', address: 'Santa Cruz de la Sierra', latitude: -17.8387857, longitude: -63.1101281, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000009', name: 'Hospital Municipal Villa Primero de Mayo', address: 'Santa Cruz de la Sierra', latitude: -17.7996139, longitude: -63.1180817, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000010', name: 'Hospital Municipal Bajío del Oriente', address: 'Santa Cruz de la Sierra', latitude: -17.8317064, longitude: -63.2101721, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000011', name: 'Instituto Oncológico del Oriente Boliviano', address: 'Santa Cruz de la Sierra', latitude: -17.7628496, longitude: -63.1942782, availableBeds: 0, hasEmergencyService: false },
    { id: '10000000-0000-4000-8000-000000000012', name: 'Hospital Privado Jasmin Medical', address: 'Santa Cruz de la Sierra', latitude: -17.8153248, longitude: -63.1785087, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000013', name: 'Clínica Médica Solidaria', address: 'Santa Cruz de la Sierra', latitude: -17.8475906, longitude: -63.0903889, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000014', name: 'Clínica Médica Señor de los Milagros', address: 'Santa Cruz de la Sierra', latitude: -17.8334687, longitude: -63.1139752, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000015', name: 'Clínica IRCA', address: 'Santa Cruz de la Sierra', latitude: -17.8364591, longitude: -63.2364949, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000016', name: 'Clínica Médica Andrea', address: 'Santa Cruz de la Sierra', latitude: -17.825324, longitude: -63.2283456, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000017', name: 'Clínica Medicmel', address: 'Santa Cruz de la Sierra', latitude: -17.8493661, longitude: -63.251141, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000018', name: 'Clínica San Martín de Porres', address: 'Santa Cruz de la Sierra', latitude: -17.8253082, longitude: -63.2015919, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000019', name: 'Clínica San Prudencio', address: 'Santa Cruz de la Sierra', latitude: -17.8277849, longitude: -63.2262725, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000020', name: 'Clínica Santa Fe', address: 'Santa Cruz de la Sierra', latitude: -17.7931943, longitude: -63.1504263, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000021', name: 'Hospital Católico', address: 'Santa Cruz de la Sierra', latitude: -17.7362258, longitude: -63.1614352, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000022', name: 'Clínica SINEC', address: 'Santa Cruz de la Sierra', latitude: -17.7388737, longitude: -63.146806, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000023', name: 'Clínica Universitaria UCEBOL', address: 'Santa Cruz de la Sierra', latitude: -17.7314345, longitude: -63.1695217, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000024', name: 'Clínica Vida y Esperanza', address: 'Santa Cruz de la Sierra', latitude: -17.7435263, longitude: -63.1499226, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000025', name: 'Clínica Buena Salud', address: 'Santa Cruz de la Sierra', latitude: -17.7708682, longitude: -63.1249356, availableBeds: 3, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000026', name: 'Clínica Foianini', address: 'Santa Cruz de la Sierra', latitude: -17.7778, longitude: -63.1577, availableBeds: 10, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000027', name: 'Hospital COSSMIL Santa Cruz', address: 'Santa Cruz de la Sierra', latitude: -17.7607, longitude: -63.2038, availableBeds: 6, hasEmergencyService: true },
    { id: '10000000-0000-4000-8000-000000000028', name: 'Hospital Obrero CNS No. 2', address: 'Santa Cruz de la Sierra', latitude: -17.7866, longitude: -63.1618, availableBeds: 8, hasEmergencyService: true },
  ];

  readonly emergencies: EmergencyRecord[] = [];
  readonly routes: RouteRecord[] = [];
  readonly transportSolutions: TransportSolutionRecord[] = [];
  readonly dispatchEvents: DispatchEventRecord[] = [];
  readonly communications: CommunicationRecord[] = [];

  async onModuleInit(): Promise<void> {
    if (!this.supabase) return;
    const [hospitals, ambulances, emergencies, routes, solutions, events, comms] = await Promise.all([
      this.supabase.from('hospitals').select('*'),
      this.supabase.from('ambulances').select('*'),
      this.supabase.from('emergencies').select('*'),
      this.supabase.from('routes').select('*'),
      this.supabase.from('transport_solutions').select('*'),
      this.supabase.from('dispatch_events').select('*'),
      this.supabase.from('communications').select('*').order('created_at', { ascending: true }),
    ]);
    if (hospitals.error || ambulances.error || emergencies.error || routes.error || solutions.error || events.error || comms.error) {
      throw new Error('Supabase no pudo cargar los datos iniciales. Revisa las migraciones y las credenciales.');
    }
    this.hospitals.splice(0, this.hospitals.length, ...(hospitals.data ?? []).map((row) => this.mapHospital(row)));
    this.ambulances.splice(0, this.ambulances.length, ...(ambulances.data ?? []).map((row) => this.mapAmbulance(row)));
    this.emergencies.splice(0, this.emergencies.length, ...(emergencies.data ?? []).map((row) => this.mapEmergency(row)));
    this.routes.splice(0, this.routes.length, ...(routes.data ?? []).map((row) => this.mapRoute(row)));
    this.transportSolutions.splice(0, this.transportSolutions.length, ...(solutions.data ?? []).map((row) => this.mapSolution(row)));
    this.dispatchEvents.splice(0, this.dispatchEvents.length, ...(events.data ?? []).map((row) => this.mapEvent(row)));
    this.communications.splice(0, this.communications.length, ...(comms.data ?? []).map((row) => this.mapCommunication(row)));
  }

  async persistEmergency(record: EmergencyRecord): Promise<void> {
    await this.write('emergencies', { id: record.id, description: record.description, latitude: record.latitude, longitude: record.longitude, status: record.status, assigned_ambulance_id: record.assignedAmbulanceId, assigned_hospital_id: record.assignedHospitalId, created_at: record.createdAt, updated_at: record.updatedAt });
  }

  async persistAmbulance(record: AmbulanceRecord): Promise<void> {
    await this.write('ambulances', { id: record.id, code: record.code, latitude: record.latitude, longitude: record.longitude, status: record.status, capacity: record.capacity, current_hospital_id: record.currentHospitalId, base_fare: record.baseFare, fare_per_km: record.farePerKm });
  }

  async persistRoute(record: RouteRecord): Promise<void> {
    await this.write('routes', { id: record.id, emergency_id: record.emergencyId, origin: record.origin, destination: record.destination, distance_meters: record.distanceMeters, estimated_minutes: record.estimatedMinutes, has_blockage: record.hasBlockage, alternative_route: record.alternativeRoute ?? null, status: record.status });
  }

  async persistSolution(record: TransportSolutionRecord): Promise<void> {
    await this.write('transport_solutions', { id: record.id, emergency_id: record.emergencyId, method: record.method, initial_matrix: record.initialMatrix, final_assignment: record.finalAssignment, total_cost_minutes: record.totalCostMinutes });
  }

  async persistEvent(record: DispatchEventRecord): Promise<void> {
    await this.write('dispatch_events', { id: record.id, emergency_id: record.emergencyId, event_type: record.eventType, payload: record.payload, occurred_at: record.occurredAt });
  }

  async persistCommunication(record: CommunicationRecord): Promise<void> {
    await this.write('communications', { id: record.id, emergency_id: record.emergencyId, from_role: record.from, text: record.text, is_audio: record.isAudio, ambulance_code: record.ambulanceCode ?? null, created_at: record.createdAt });
  }

  private createSupabaseClient(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return this.databaseMode === 'supabase' && url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  }

  private async write(table: string, row: Record<string, unknown>): Promise<void> {
    if (!this.supabase) return;
    const { error } = await this.supabase.from(table).upsert(row);
    if (error) console.error(`[supabase] ${table}: ${error.message}`);
  }

  private mapHospital(row: any): HospitalRecord { return { id: row.id, name: row.name, address: row.address, latitude: row.latitude, longitude: row.longitude, availableBeds: row.available_beds, hasEmergencyService: row.has_emergency_service }; }
  private mapAmbulance(row: any): AmbulanceRecord { return { id: row.id, code: row.code, latitude: row.latitude, longitude: row.longitude, status: row.status, capacity: row.capacity, currentHospitalId: row.current_hospital_id, baseFare: row.base_fare, farePerKm: row.fare_per_km }; }
  private mapEmergency(row: any): EmergencyRecord { return { id: row.id, description: row.description, latitude: row.latitude, longitude: row.longitude, status: row.status, assignedAmbulanceId: row.assigned_ambulance_id, assignedHospitalId: row.assigned_hospital_id, createdAt: row.created_at, updatedAt: row.updated_at }; }
  private mapRoute(row: any): RouteRecord { return { id: row.id, emergencyId: row.emergency_id, origin: row.origin, destination: row.destination, distanceMeters: row.distance_meters, estimatedMinutes: Number(row.estimated_minutes), hasBlockage: row.has_blockage, alternativeRoute: row.alternative_route ?? undefined, alternatives: row.alternative_route ? [row.alternative_route] : [], status: row.status }; }
  private mapSolution(row: any): TransportSolutionRecord { return { id: row.id, emergencyId: row.emergency_id, method: row.method, initialMatrix: row.initial_matrix, finalAssignment: row.final_assignment, totalCostMinutes: Number(row.total_cost_minutes) }; }
  private mapEvent(row: any): DispatchEventRecord { return { id: row.id, emergencyId: row.emergency_id, eventType: row.event_type, payload: row.payload, occurredAt: row.occurred_at }; }
  private mapCommunication(row: any): CommunicationRecord { return { id: row.id, emergencyId: row.emergency_id, from: row.from_role, text: row.text, isAudio: row.is_audio, ambulanceCode: row.ambulance_code ?? undefined, createdAt: row.created_at }; }

  newId(): string {
    return randomUUID();
  }
}
