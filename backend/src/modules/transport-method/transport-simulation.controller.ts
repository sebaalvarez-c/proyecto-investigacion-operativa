import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { InMemoryStore, type Coordinate } from '../../database/in-memory-store.js';
import { DeterministicRouteProvider } from '../routes/route-provider.js';
import { RoutesService } from '../routes/routes.service.js';
import { solveByMinimumCost } from './application/transport-solver.js';
import { solveTransportTrace } from './application/transport-trace.js';

type Patient = Coordinate & { id: string };
type Unit = { id: string; hospitalId: string };
type Scenario = { hospitalIds: string[]; patients: Patient[]; units: Unit[]; bedsUsed: string[] };

@Controller('simulations/transport')
export class TransportSimulationController {
  constructor(private readonly store: InMemoryStore, private readonly routes: RoutesService,
    private readonly estimate: DeterministicRouteProvider) {}

  @Post('solve')
  async solve(@Body() input: Scenario) {
    const { hospitalIds, patients, units, bedsUsed } = input ?? {};
    if (!Array.isArray(hospitalIds) || hospitalIds.length < 1 || hospitalIds.length > 4 ||
      new Set(hospitalIds).size !== hospitalIds.length ||
      !Array.isArray(patients) || patients.length < 1 || patients.length > 5 ||
      new Set(patients.map((patient) => patient?.id)).size !== patients.length ||
      patients.some((p) => !p || !/^P[1-5]$/.test(p.id) || !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) || Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) ||
      !Array.isArray(units) || units.length > 3 || new Set(units.map((unit) => unit?.id)).size !== units.length ||
      units.some((unit) => !unit || !/^A[1-3]$/.test(unit.id) || !hospitalIds.includes(unit.hospitalId)) ||
      !Array.isArray(bedsUsed) || bedsUsed.length > 5 || bedsUsed.some((id) => !hospitalIds.includes(id))) {
      throw new BadRequestException('Revisa los hospitales, personas y recursos del escenario.');
    }
    const hospitals = hospitalIds.map((id) => this.store.hospitals.find((hospital) => hospital.id === id));
    if (hospitals.some((hospital) => !hospital)) throw new BadRequestException('Hospital desconocido.');
    const bases = hospitals.map((hospital) => hospital!);
    const beds = bases.map((hospital) => hospital.hasEmergencyService
      ? Math.max(0, hospital.availableBeds - bedsUsed.filter((id) => id === hospital.id).length) : 0);
    const capacity = Math.min(units.length, patients.length, beds.reduce((sum, n) => sum + n, 0));
    const supply = bases.map((hospital) => units.filter((unit) => unit.hospitalId === hospital.id).length);
    const rows = bases.map((hospital, i) => ({ id: hospital.id, label: 'H' + (i + 1), name: hospital.name }));
    const columns = patients.map((patient) => ({ id: patient.id, label: patient.id }));

    const backup = async (origin: Coordinate, destination: Coordinate) => {
      const primary = await this.estimate.getRoute(origin, destination);
      return { origin, destination, primary, alternatives: [], source: 'Estimación simulada' };
    };
    const leg = (origin: Coordinate, destination: Coordinate) =>
      this.routes.streetRoute(origin, destination).catch(() => backup(origin, destination));

    const pickups = await Promise.all(bases.map((hospital) => Promise.all(patients.map((patient) => leg(hospital, patient)))));
    const costs = pickups.map((row) => row.map((route) => Math.round(route.primary.estimatedMinutes * 10)));
    const demand = patients.map(() => 1);
    // The dummy row and column fix the real shipment total to the available capacity.
    const unserved = patients.length - capacity;
    const idle = units.length - capacity;
    if (idle) {
      columns.push({ id: 'idle', label: 'Sin salida' });
      demand.push(idle);
      costs.forEach((row) => row.push(0));
    }
    if (unserved) {
      rows.push({ id: 'pending', label: 'En espera', name: 'Demanda pendiente' });
      supply.push(unserved);
      costs.push([...patients.map(() => 0), ...(idle ? [1 + capacity * Math.max(...costs.flat())] : [])]);
    }
    const trace = solveTransportTrace(costs, supply, demand);
    const minimumCost = solveByMinimumCost({ origins: rows.map((row) => row.id),
      destinations: columns.map((col) => col.id), costs, supply, demand });
    const freeUnits = [...units].sort((a, b) => a.id.localeCompare(b.id));
    const assignments = [];
    const pending = [];
    for (const [col, patient] of patients.entries()) {
      const row = bases.findIndex((_, i) => trace.final[i][col] > 0);
      if (row < 0) { pending.push(patient.id); continue; }
      const base = bases[row];
      const unit = freeUnits.splice(freeUnits.findIndex((item) => item.hospitalId === base.id), 1)[0];
      const candidates = await Promise.all(bases.map(async (hospital, index) => beds[index] > 0
        ? { hospital, index, route: await leg(patient, hospital) } : null));
      const available = candidates.filter((item) => item !== null);
      available.sort((a, b) => a.route.primary.estimatedMinutes - b.route.primary.estimatedMinutes || a.index - b.index);
      const destination = available[0];
      beds[destination.index] -= 1;
      const pickup = pickups[row][col];
      assignments.push({ patientId: patient.id, unit, base, hospital: destination.hospital,
        pickup, transfer: destination.route, priceBs: fare(row, pickup.primary.distanceMeters) });
    }
    return { rows, columns, supply, demand, costs, trace, pending, assignments,
      minimumCost: minimumCost.totalCost, cells: pickups.map((row, i) => row.map((route) => ({
        source: route.source, meters: route.primary.distanceMeters, baseFare: 70 + i * 5, farePerKm: 7,
        priceBs: fare(i, route.primary.distanceMeters),
      }))) };
  }
}

function fare(row: number, meters: number): number {
  return Math.round((70 + row * 5 + 7 * meters / 1000) * 100) / 100;
}
