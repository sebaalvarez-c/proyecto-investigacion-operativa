import { Injectable } from '@nestjs/common';
import { InMemoryStore } from './in-memory-store.js';
import type { AmbulanceStatus, CommunicationRecord, CommunicationSender, DispatchEventRecord, DispatchEventType, EmergencyRecord, HospitalRecord, RouteRecord, TransportSolutionRecord } from './in-memory-store.js';

@Injectable()
export class EmergencyRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(input: Pick<EmergencyRecord, 'description' | 'latitude' | 'longitude'>): EmergencyRecord {
    const now = new Date().toISOString();
    const record: EmergencyRecord = { ...input, id: this.store.newId(), status: 'PENDING', assignedAmbulanceId: null, assignedHospitalId: null, createdAt: now, updatedAt: now };
    this.store.emergencies.push(record);
    void this.store.persistEmergency(record);
    return record;
  }

  findById(id: string): EmergencyRecord | undefined {
    return this.store.emergencies.find((emergency) => emergency.id === id);
  }

  update(id: string, patch: Partial<EmergencyRecord>): EmergencyRecord | undefined {
    const record = this.findById(id);
    if (!record) return undefined;
    Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    void this.store.persistEmergency(record);
    return record;
  }
}

@Injectable()
export class AmbulanceRepository {
  constructor(private readonly store: InMemoryStore) {}

  list(status?: AmbulanceStatus) {
    return status ? this.store.ambulances.filter((ambulance) => ambulance.status === status) : [...this.store.ambulances];
  }

  findById(id: string) {
    return this.store.ambulances.find((ambulance) => ambulance.id === id);
  }

  updateStatus(id: string, status: AmbulanceStatus) {
    const ambulance = this.findById(id);
    if (ambulance) ambulance.status = status;
    if (ambulance) void this.store.persistAmbulance(ambulance);
    return ambulance;
  }
}

@Injectable()
export class HospitalRepository {
  constructor(private readonly store: InMemoryStore) {}

  list(emergencyOnly = false): HospitalRecord[] {
    return this.store.hospitals.filter((hospital) => !emergencyOnly || (hospital.hasEmergencyService && hospital.availableBeds > 0));
  }

  findById(id: string) {
    return this.store.hospitals.find((hospital) => hospital.id === id);
  }
}

@Injectable()
export class RouteRepository {
  constructor(private readonly store: InMemoryStore) {}

  save(route: RouteRecord): RouteRecord {
    this.store.routes.push(route);
    void this.store.persistRoute(route);
    return route;
  }
}

@Injectable()
export class TransportSolutionRepository {
  constructor(private readonly store: InMemoryStore) {}

  save(solution: TransportSolutionRecord): TransportSolutionRecord {
    this.store.transportSolutions.push(solution);
    void this.store.persistSolution(solution);
    return solution;
  }
}

@Injectable()
export class DispatchEventRepository {
  constructor(private readonly store: InMemoryStore) {}

  append(emergencyId: string, eventType: DispatchEventType, payload: Record<string, unknown> = {}): DispatchEventRecord {
    const event = { id: this.store.newId(), emergencyId, eventType, payload, occurredAt: new Date().toISOString() };
    this.store.dispatchEvents.push(event);
    void this.store.persistEvent(event);
    return event;
  }

  list(emergencyId: string): DispatchEventRecord[] {
    return this.store.dispatchEvents.filter((event) => event.emergencyId === emergencyId);
  }
}

@Injectable()
export class CommunicationRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(input: { emergencyId: string; from: CommunicationSender; text: string; isAudio: boolean; ambulanceCode?: string; recipientEmail?: string }): CommunicationRecord {
    const record: CommunicationRecord = { ...input, id: this.store.newId(), createdAt: new Date().toISOString() };
    this.store.communications.push(record);
    void this.store.persistCommunication(record);
    return record;
  }

  listByEmergency(emergencyId: string): CommunicationRecord[] {
    return this.store.communications.filter((c) => c.emergencyId === emergencyId);
  }

  listAll(): CommunicationRecord[] {
    return [...this.store.communications].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
