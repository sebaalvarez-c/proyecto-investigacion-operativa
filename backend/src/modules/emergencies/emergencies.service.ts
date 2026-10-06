import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { solveByMinimumCost } from '../transport-method/application/transport-solver.js';
import type { TransportProblem } from '../transport-method/domain/transport.types.js';
import { AmbulanceRepository, EmergencyRepository, HospitalRepository, TransportSolutionRepository } from '../../database/in-memory.repositories.js';
import { InMemoryStore } from '../../database/in-memory-store.js';
import { DeterministicRouteProvider } from '../routes/route-provider.js';
import type { CreateEmergencyDto } from './dto/create-emergency.dto.js';

@Injectable()
export class EmergenciesService {
  constructor(
    private readonly emergencies: EmergencyRepository,
    private readonly ambulances: AmbulanceRepository,
    private readonly hospitals: HospitalRepository,
    private readonly solutions: TransportSolutionRepository,
    private readonly store: InMemoryStore,
    private readonly routeProvider: DeterministicRouteProvider,
  ) {}

  create(input: CreateEmergencyDto) {
    return this.emergencies.create(input);
  }

  get(id: string) {
    const emergency = this.emergencies.findById(id);
    if (!emergency) throw new NotFoundException('Emergency not found');
    return emergency;
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
