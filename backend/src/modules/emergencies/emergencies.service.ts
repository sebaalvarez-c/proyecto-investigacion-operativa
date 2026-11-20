import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { solveByMinimumCost } from '../transport-method/application/transport-solver.js';
import type { TransportProblem } from '../transport-method/domain/transport.types.js';
import { AmbulanceRepository, DispatchEventRepository, EmergencyRepository, HospitalRepository, TransportSolutionRepository } from '../../database/in-memory.repositories.js';
import { InMemoryStore } from '../../database/in-memory-store.js';
import { DeterministicRouteProvider } from '../routes/route-provider.js';
import type { CreateEmergencyDto } from './dto/create-emergency.dto.js';
import { RoutesService } from '../routes/routes.service.js';

@Injectable()
export class EmergenciesService {
  private readonly dispatches = new Map<string, Awaited<ReturnType<EmergenciesService['buildDispatch']>>>();
  constructor(
    private readonly emergencies: EmergencyRepository,
    private readonly ambulances: AmbulanceRepository,
    private readonly hospitals: HospitalRepository,
    private readonly solutions: TransportSolutionRepository,
    private readonly store: InMemoryStore,
    private readonly routeProvider: DeterministicRouteProvider,
    private readonly routesService: RoutesService,
    private readonly events: DispatchEventRepository,
  ) {}

  create(input: CreateEmergencyDto) {
    const emergency = this.emergencies.create(input);
    this.events.append(emergency.id, 'CREATED', { latitude: input.latitude, longitude: input.longitude });
    return emergency;
  }

  get(id: string) {
    const emergency = this.emergencies.findById(id);
    if (!emergency) throw new NotFoundException('Emergency not found');
    return emergency;
  }

  async options(id: string) {
    const emergency = this.get(id);
    const candidates = this.ambulances.list('AVAILABLE').filter((a) => a.currentHospitalId && this.hospitals.findById(a.currentHospitalId));
    const options = await Promise.all(candidates.map(async (ambulance) => {
      const route = await this.routesService.streetRoute(ambulance, emergency);
      return { id: ambulance.id, code: ambulance.code, hospital: this.hospitals.findById(ambulance.currentHospitalId!)!, distanceMeters: route.primary.distanceMeters, estimatedMinutes: route.primary.estimatedMinutes, priceBs: Math.round((ambulance.baseFare + ambulance.farePerKm * route.primary.distanceMeters / 1000) * 100) / 100 };
    }));
    const available = options.filter((option) => option.distanceMeters <= 30000).sort((a, b) => a.estimatedMinutes - b.estimatedMinutes || a.distanceMeters - b.distanceMeters);
    this.events.append(id, 'OPTIONS_FOUND', { count: available.length });
    return available;
  }

  private async buildDispatch(id: string, ambulanceId: string) {
    const emergency = this.get(id);
    const ambulance = this.ambulances.findById(ambulanceId);
    if (!ambulance || ambulance.status !== 'AVAILABLE' || !ambulance.currentHospitalId) throw new ConflictException('La ambulancia ya no está disponible. Vuelve a buscar.');
    const base = this.hospitals.findById(ambulance.currentHospitalId);
    if (!base) throw new NotFoundException('No se encontró el hospital de origen.');
    const hospitals = this.hospitals.list(true);
    if (!hospitals.length) throw new ConflictException('No hay hospitales disponibles.');
    const [pickup, destinationResults] = await Promise.all([
      this.routesService.streetRoute(ambulance, emergency),
      Promise.allSettled(hospitals.map(async (hospital) => ({ hospital, route: await this.routesService.streetRoute(emergency, hospital) }))),
    ]);
    const destinations = destinationResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    if (!destinations.length) throw new ConflictException('No se encontró una ruta por calles a un hospital receptor.');
    if (pickup.primary.distanceMeters > 30000) throw new ConflictException('La ambulancia está fuera del área de búsqueda.');
    if (ambulance.status !== 'AVAILABLE' || emergency.assignedAmbulanceId) throw new ConflictException('La disponibilidad cambió. Vuelve a buscar.');
    destinations.sort((a, b) => a.route.primary.estimatedMinutes - b.route.primary.estimatedMinutes);
    const best = destinations[0];
    const costs = destinations.map((item) => Math.round((pickup.primary.estimatedMinutes + item.route.primary.estimatedMinutes) * 10) / 10);
    const problem: TransportProblem = { origins: [ambulance.code], destinations: destinations.map((item) => item.hospital.name), costs: [costs], supply: [1], demand: destinations.map((_, index) => index === 0 ? 1 : 0) };
    const solved = solveByMinimumCost(problem);
    const solution = { matrix: problem, assignment: solved.allocations[0], allocations: solved.allocations, totalCost: solved.totalCost };
    this.emergencies.update(id, { status: 'DISPATCHED', assignedAmbulanceId: ambulance.id, assignedHospitalId: best.hospital.id });
    this.ambulances.updateStatus(ambulance.id, 'DISPATCHED');
    this.solutions.save({ id: this.store.newId(), emergencyId: id, method: 'MINIMUM_COST', initialMatrix: problem, finalAssignment: solved, totalCostMinutes: solved.totalCost });
    this.events.append(id, 'ASSIGNED', { ambulanceId: ambulance.id, hospitalId: best.hospital.id });
    return { ambulance: { id: ambulance.id, code: ambulance.code }, base, hospital: best.hospital, priceBs: Math.round((ambulance.baseFare + ambulance.farePerKm * pickup.primary.distanceMeters / 1000) * 100) / 100, pickup, transfer: best.route, solution };
  }

  async dispatch(id: string, ambulanceId?: string) {
    if (!ambulanceId || typeof ambulanceId !== 'string') throw new BadRequestException('Selecciona una ambulancia.');
    const existing = this.dispatches.get(id);
    if (existing) {
      if (existing.ambulance.id !== ambulanceId) throw new ConflictException('Este incidente ya tiene una ambulancia asignada.');
      return existing;
    }
    const result = await this.buildDispatch(id, ambulanceId);
    this.dispatches.set(id, result);
    return result;
  }

  complete(id: string) {
    const emergency = this.get(id);
    if (!emergency.assignedAmbulanceId) throw new ConflictException('No hay una ambulancia asignada.');
    if (emergency.status !== 'ARRIVED') {
      this.ambulances.updateStatus(emergency.assignedAmbulanceId, 'AVAILABLE');
      this.emergencies.update(id, { status: 'ARRIVED' });
      this.events.append(id, 'ARRIVED_AT_HOSPITAL', { hospitalId: emergency.assignedHospitalId });
    }
    return { status: 'ARRIVED' };
  }

  async optimize(id: string, forceNoAvailability = false) {
    const emergency = this.emergencies.findById(id);
    if (!emergency) throw new NotFoundException('Emergency not found');

    const availableAmbulances = forceNoAvailability ? [] : this.ambulances.list('AVAILABLE');
    const availableHospitals = this.hospitals.list(true).slice(0, availableAmbulances.length);
    if (availableAmbulances.length === 0 || availableHospitals.length === 0) {
      throw new ConflictException('No available ambulances or hospitals for this emergency');
    }

    const costs = await Promise.all(availableAmbulances.map(async (ambulance) =>
      Promise.all(availableHospitals.map(async (hospital) =>
        (await this.routeProvider.getRoute(ambulance, hospital)).estimatedMinutes,
      )),
    ));
    const problem: TransportProblem = {
      origins: availableAmbulances.map((ambulance) => ambulance.code),
      destinations: availableHospitals.map((hospital) => hospital.name),
      costs,
      supply: availableAmbulances.map(() => 1),
      demand: availableHospitals.map(() => 1),
    };
    const solution = solveByMinimumCost(problem);
    const assignment = solution.allocations[0];
    const ambulance = availableAmbulances.find((candidate) => candidate.code === assignment.originId)!;
    const hospital = availableHospitals.find((candidate) => candidate.name === assignment.destinationId)!;
    this.emergencies.update(id, { status: 'DISPATCHED', assignedAmbulanceId: ambulance.id, assignedHospitalId: hospital.id });
    this.ambulances.updateStatus(ambulance.id, 'DISPATCHED');
    this.solutions.save({ id: this.store.newId(), emergencyId: id, method: 'MINIMUM_COST', initialMatrix: problem, finalAssignment: solution, totalCostMinutes: solution.totalCost });

    return { matrix: problem, assignment, allocations: solution.allocations, totalCost: solution.totalCost };
  }
}
